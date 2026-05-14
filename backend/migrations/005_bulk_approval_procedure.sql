-- Migration: 005_bulk_approval_procedure.sql
-- Description: Adds a stored procedure for high-performance bulk approval of import candidates.

CREATE OR REPLACE FUNCTION approve_all_import_candidates(p_job_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_dest_test_id UUID;
    v_job_config JSONB;
    v_candidate RECORD;
    v_question_id UUID;
    v_order_index INTEGER;
    v_approved_count INTEGER := 0;
BEGIN
    -- 1. Get job info
    SELECT destination_test_id, config INTO v_dest_test_id, v_job_config
    FROM import_jobs WHERE id = p_job_id;

    -- 2. Loop through review_required candidates
    FOR v_candidate IN 
        SELECT id, normalized_json FROM import_candidates 
        WHERE job_id = p_job_id AND status = 'review_required'
    LOOP
        -- 3. Insert into questions
        INSERT INTO questions (
            text, passage, options, answer, explanation, 
            subject, difficulty, type, tags, skill, 
            test_id, module, image_url, option_images
        ) VALUES (
            COALESCE(v_candidate.normalized_json->>'text', 'No question text provided.'),
            v_candidate.normalized_json->>'passage',
            (CASE 
                WHEN jsonb_typeof(v_candidate.normalized_json->'options') = 'object' 
                THEN (SELECT ARRAY_AGG(value) FROM jsonb_each_text(v_candidate.normalized_json->'options'))
                WHEN jsonb_typeof(v_candidate.normalized_json->'options') = 'array'
                THEN (SELECT ARRAY_AGG(x) FROM jsonb_array_elements_text(v_candidate.normalized_json->'options') x)
                ELSE ARRAY[]::text[]
            END)::text[],
            COALESCE(v_candidate.normalized_json->>'correct_answer', 'TBD'),
            COALESCE(v_candidate.normalized_json->>'explanation', ''),
            COALESCE(v_job_config->>'subject', v_candidate.normalized_json->>'subject', 'math'),
            COALESCE(v_candidate.normalized_json->>'difficulty', 'medium'),
            COALESCE(v_candidate.normalized_json->>'type', 'multiple-choice'),
            COALESCE(v_candidate.normalized_json->'skill_tags', '[]'::jsonb),
            COALESCE(v_candidate.normalized_json->>'skill', (v_candidate.normalized_json->'skill_tags'->>0)),
            v_dest_test_id,
            COALESCE(v_job_config->>'module', v_candidate.normalized_json->>'module', 'm1'),
            v_candidate.normalized_json->>'image_url',
            (CASE 
                WHEN jsonb_typeof(v_candidate.normalized_json->'option_images') = 'array'
                THEN (SELECT ARRAY_AGG(x) FROM jsonb_array_elements_text(v_candidate.normalized_json->'option_images') x)
                ELSE ARRAY[]::text[]
            END)::text[]
        ) RETURNING id INTO v_question_id;

        -- 4. Link to test
        IF v_dest_test_id IS NOT NULL THEN
            SELECT COALESCE(MAX(order_index), -1) + 1 INTO v_order_index
            FROM test_questions WHERE test_id = v_dest_test_id;

            INSERT INTO test_questions (test_id, question_id, order_index)
            VALUES (v_dest_test_id, v_question_id, v_order_index)
            ON CONFLICT (test_id, question_id) DO NOTHING;
        END IF;

        -- 5. Update candidate
        UPDATE import_candidates 
        SET question_id = v_question_id, status = 'approved'
        WHERE id = v_candidate.id;

        v_approved_count := v_approved_count + 1;
    END LOOP;

    -- 6. Update job status
    UPDATE import_jobs SET status = 'done' WHERE id = p_job_id;

    RETURN jsonb_build_object(
        'success', true,
        'approved_count', v_approved_count,
        'job_id', p_job_id
    );
END;
$$ LANGUAGE plpgsql;
