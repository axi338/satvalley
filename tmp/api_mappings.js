// --- REFACTOR_PLAN ---
// This is a temporary scratch file to map out the required API route mappings

// OnboardingPage.tsx
// .from('profiles').update({ full_name, role, grade, onboarding_complete: true }).eq('id', user.id) -> POST /api/me/profile

// ProfilePage.tsx
// .storage.from('avatars').upload(...)
// .from('profiles').update({ avatar_url })
// .storage.from('banners').upload(...)
// .from('profiles').update({ banner_url })
// .from('profiles').update({ full_name })
// -> Need: POST /api/me/avatar (multipart/form-data), POST /api/me/banner, POST /api/me/profile

// OlympiadPage.tsx
// .from('olympiad_profiles').select('*').eq('id', user.id).maybeSingle() -> GET /api/me/olympiad-profile (DONE)

// ScoreHistoryPage.tsx
// .from('results').select('id, score, created_at, math_score, rw_score, time_taken, test_id, tests(title, difficulty)').eq('user_id', user.id)
// -> GET /api/me/results

// ReviewPage.tsx
// .from('results').select('..., tests(...)').eq('id', params.session).maybeSingle()
// -> GET /api/me/results/:id

// NewImport.tsx
// .from('tests').select('id, title').order('created_at', { ascending: false })
// -> GET /api/tests

// ImportDashboard.tsx
// .from('import_jobs').select('*').order('created_at', { ascending: false })
// .from('import_candidates').delete().eq('job_id', id)
// .from('import_jobs').delete().eq('id', id)
// -> GET /api/admin/imports, DELETE /api/admin/imports/:id

// ImportReview.tsx
// .from('import_candidates').select('*').eq('job_id', jobId).order('question_number')
// -> GET /api/admin/imports/:id/candidates
