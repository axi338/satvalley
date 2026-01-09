import { useEffect, useState } from 'react';
import { Shield, Plus, FileText, Award, Database, UserRound, RefreshCw, Trash2, Edit, Save, X as CloseIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { supabase } from '../../lib/supabase';

export function AdminPage() {
  const [testTitle, setTestTitle] = useState('');
  const [testDifficulty, setTestDifficulty] = useState('Medium');
  const [testDescription, setTestDescription] = useState('');
  const [mathq, setMathq] = useState('58');
  const [readingq, setReadingq] = useState('52');
  const [writingq, setWritingq] = useState('44');
  const [questionText, setQuestionText] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentScore, setStudentScore] = useState('');
  const [studentPhoto, setStudentPhoto] = useState<File | null>(null);
  const [studentPhotoPreview, setStudentPhotoPreview] = useState<string | null>(null);
  const [tests, setTests] = useState<Array<{ id: string; title: string; difficulty: string; mathq?: string; readingq?: string; writingq?: string }>>([]);
  const [questions, setQuestions] = useState<Array<any>>([]);
  const [results, setResults] = useState<Array<any>>([]);
  const [selectedTestId, setSelectedTestId] = useState('');
  const [passage, setPassage] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [optionC, setOptionC] = useState('');
  const [optionD, setOptionD] = useState('');
  const [questionType, setQuestionType] = useState<'multiple-choice' | 'numeric'>('multiple-choice');
  const [moduleType, setModuleType] = useState<'m1' | 'm2-easy' | 'm2-hard'>('m1');
  const [testedSkill, setTestedSkill] = useState('');
  const [explanation, setExplanation] = useState('');
  const [questionImage, setQuestionImage] = useState<File | null>(null);
  const [questionImagePreview, setQuestionImagePreview] = useState<string | null>(null);
  const [questionSubject, setQuestionSubject] = useState<'rw' | 'math'>('rw');
  const [optionImages, setOptionImages] = useState<Array<File | null>>([null, null, null, null]);
  const [optionImagePreviews, setOptionImagePreviews] = useState<Array<string | null>>([null, null, null, null]);
  const [editingResultId, setEditingResultId] = useState<string | null>(null);

  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  const [questionFilterTestId, setQuestionFilterTestId] = useState<string>('');
  const [questionFilterSubject, setQuestionFilterSubject] = useState<string>('');
  const [flash, setFlash] = useState<string | null>(null);
  const [users, setUsers] = useState<Array<{ uid: string; email: string; lastLogin?: string }> | null>(null);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);

  const apiBase = import.meta.env.VITE_BACKEND_URL || '';
  const adminUsersEndpoint = `${apiBase}/listUsers`;

  const fetchUsers = async () => {
    if (!apiBase) {
      setUsersError('Configure VITE_BACKEND_URL to list users.');
      return;
    }
    setUsersLoading(true);
    setUsersError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        throw new Error('Missing auth token. Please re-login.');
      }
      const res = await fetch(adminUsersEndpoint, {
        headers: { accept: 'application/json', authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error(`Request failed (${res.status})`);
      }
      const body = await res.json();
      setUsers(body.users || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load users.';
      setUsersError(message);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (apiBase) {
      void fetchUsers();
    } else {
      setUsersError('Set VITE_BACKEND_URL (server endpoint backed by Supabase Admin SDK).');
    }
  }, [apiBase]);

  const authedRequest = async (path: string, options: RequestInit = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error('Missing auth token. Please log in again.');
    const res = await fetch(`${apiBase}${path}`, {
      ...options,
      headers: {
        ...(options.headers || {}),
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || `Request failed (${res.status})`);
    }
    return res.json();
  };

  const loadData = async () => {
    try {
      const [testsRes, questionsRes, resultsRes] = await Promise.all([
        fetch(`${apiBase}/api/tests`).then((r) => r.json()).catch(() => ({ tests: [] })),
        fetch(`${apiBase}/api/questions`).then((r) => r.json()).catch(() => ({ questions: [] })),
        fetch(`${apiBase}/api/results`).then((r) => r.json()).catch(() => ({ results: [] })),
      ]);
      setTests(testsRes.tests || []);
      setQuestions((questionsRes.questions || []).map((q: any) => ({
        ...q,
        testId: q.test_id,
        imageUrl: q.image_url,
        optionImages: q.option_images
      })));
      setResults((resultsRes.results || []).map((r: any) => ({
        ...r,
        photoUrl: r.photo_url
      })));
    } catch (err) {
      setFlash(err instanceof Error ? err.message : 'Failed to load data');
    }
  };

  useEffect(() => {
    void loadData();
  }, [apiBase]);

  const showFlash = (message: string) => {
    setFlash(message);
    setTimeout(() => setFlash(null), 2000);
  };

  const handleAddTest = () => {
    if (!testTitle) {
      showFlash('Add a test title first.');
      return;
    }

    const payload = {
      title: testTitle,
      difficulty: testDifficulty,
      description: testDescription,
      sections: [`Math: ${mathq}Q`, `Reading: ${readingq}Q`, `Writing: ${writingq}Q`],
      mathq,
      readingq,
      writingq
    };

    if (editingTestId) {
      authedRequest(`/api/tests/${editingTestId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
        .then(() => {
          setTests((prev) =>
            prev.map((t) => (t.id === editingTestId ? { ...t, ...payload } : t))
          );
          resetTestForm();
          showFlash('Test updated.');
        })
        .catch((err) => showFlash(err.message));
    } else {
      authedRequest('/api/tests', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
        .then((data) => {
          setTests((prev) => [data.test, ...prev]);
          resetTestForm();
          showFlash('Test added.');
        })
        .catch((err) => showFlash(err.message));
    }
  };

  const resetTestForm = () => {
    setTestTitle('');
    setTestDifficulty('Medium');
    setTestDescription('');
    setMathq('58');
    setReadingq('52');
    setWritingq('44');
    setEditingTestId(null);
  };

  const handleEditTest = (t: any) => {
    setEditingTestId(t.id);
    setTestTitle(t.title || '');
    setTestDifficulty(t.difficulty || 'Medium');
    setTestDescription(t.description || '');
    setMathq(t.mathq || '58');
    setReadingq(t.readingq || '52');
    setWritingq(t.writingq || '44');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteTest = (id: string) => {
    if (!window.confirm('Are you sure you want to delete this test?')) return;
    authedRequest(`/api/tests/${id}`, {
      method: 'DELETE',
    })
      .then(() => {
        setTests((prev) => prev.filter((t) => t.id !== id));
        showFlash('Test deleted.');
      })
      .catch((err) => showFlash(err.message));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setQuestionImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setQuestionImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOptionImageChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const newImages = [...optionImages];
      newImages[index] = file;
      setOptionImages(newImages);

      const reader = new FileReader();
      reader.onloadend = () => {
        const newPreviews = [...optionImagePreviews];
        newPreviews[index] = reader.result as string;
        setOptionImagePreviews(newPreviews);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const formData = new FormData();
    formData.append('image', file);
    const res = await fetch(`${apiBase}/api/upload`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    if (!res.ok) throw new Error('Upload failed');
    const data = await res.json();
    return data.url;
  };

  const handleAddQuestion = async () => {
    if (!questionText || !correctAnswer) {
      showFlash('Question text and correct answer are required.');
      return;
    }

    try {
      let imageUrl = questionImagePreview?.startsWith('/') ? questionImagePreview : null;
      if (questionImage) {
        imageUrl = await uploadImage(questionImage);
      }

      const finalOptionImages = [...optionImagePreviews];
      if (questionSubject === 'math') {
        for (let i = 0; i < 4; i++) {
          if (optionImages[i]) {
            finalOptionImages[i] = await uploadImage(optionImages[i]!);
          }
        }
      }

      const payload = {
        text: questionText,
        answer: correctAnswer,
        testId: selectedTestId || null,
        passage: passage || null,
        options: [optionA, optionB, optionC, optionD],
        type: questionType,
        module: moduleType,
        skill: testedSkill || null,
        explanation: explanation || null,
        imageUrl,
        subject: questionSubject,
        optionImages: finalOptionImages,
      };

      if (editingQuestionId) {
        await authedRequest(`/api/questions/${editingQuestionId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setQuestions((prev) =>
          prev.map((q) => (q.id === editingQuestionId ? { ...q, ...payload } : q))
        );
        resetQuestionForm();
        showFlash('Question updated.');
      } else {
        const data = await authedRequest('/api/questions', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setQuestions((prev) => [data.question, ...prev]);
        resetQuestionForm();
        showFlash('Question added.');
      }
    } catch (err: any) {
      showFlash(err.message);
    }
  };

  const resetQuestionForm = () => {
    setQuestionText('');
    setCorrectAnswer('');
    setPassage('');
    setOptionA('');
    setOptionB('');
    setOptionC('');
    setOptionD('');
    setQuestionSubject('rw');
    setOptionImages([null, null, null, null]);
    setOptionImagePreviews([null, null, null, null]);
    setQuestionType('multiple-choice');
    setModuleType('m1');
    setTestedSkill('');
    setExplanation('');
    setQuestionImage(null);
    setQuestionImagePreview(null);
    setEditingQuestionId(null);
    setSelectedTestId('');
  };

  const handleEditQuestion = (q: any) => {
    setEditingQuestionId(q.id);
    setQuestionText(q.text || '');
    setCorrectAnswer(q.answer || '');
    setSelectedTestId(q.testId || '');
    setPassage(q.passage || '');
    setOptionA(q.options?.[0] || '');
    setOptionB(q.options?.[1] || '');
    setOptionC(q.options?.[2] || '');
    setOptionD(q.options?.[3] || '');
    setQuestionType(q.type || 'multiple-choice');
    setModuleType(q.module || 'm1');
    setTestedSkill(q.skill || '');
    setExplanation(q.explanation || '');
    setQuestionImagePreview(q.imageUrl || null);
    setQuestionImage(null);
    setQuestionSubject(q.subject || 'rw');
    setOptionImages([null, null, null, null]);
    setOptionImagePreviews(q.optionImages || [null, null, null, null]);
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const handleDeleteQuestion = (id: string) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;
    authedRequest(`/api/questions/${id}`, {
      method: 'DELETE',
    })
      .then(() => {
        setQuestions((prev) => prev.filter((q) => q.id !== id));
        showFlash('Question deleted.');
      })
      .catch((err) => showFlash(err.message));
  };

  const handleAddResult = () => {
    if (!studentName || !studentScore) {
      showFlash('Student name and score are required.');
      return;
    }
    const payload = { name: studentName, score: studentScore, photoUrl: studentPhotoPreview || undefined };

    if (editingResultId) {
      authedRequest(`/api/results/${editingResultId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
        .then(() => {
          setResults((prev) =>
            prev.map((r) => (r.id === editingResultId ? { ...r, ...payload } : r))
          );
          resetResultForm();
          showFlash('Result updated.');
        })
        .catch((err) => showFlash(err.message));
    } else {
      authedRequest('/api/results', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
        .then((data) => {
          setResults((prev) => [data.result, ...prev]);
          resetResultForm();
          showFlash('Result added.');
        })
        .catch((err) => showFlash(err.message));
    }
  };

  const resetResultForm = () => {
    setStudentName('');
    setStudentScore('');
    setStudentPhoto(null);
    setStudentPhotoPreview(null);
    setEditingResultId(null);
  };

  const handleEditResult = (r: any) => {
    setEditingResultId(r.id);
    setStudentName(r.name || '');
    setStudentScore(r.score || '');
    setStudentPhotoPreview(r.photoUrl || null);
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const handleDeleteResult = (id: string) => {
    if (!window.confirm('Are you sure you want to delete this result?')) return;
    authedRequest(`/api/results/${id}`, {
      method: 'DELETE',
    })
      .then(() => {
        setResults((prev) => prev.filter((r) => r.id !== id));
        showFlash('Result deleted.');
      })
      .catch((err) => showFlash(err.message));
  };

  return (
    <div className="min-h-screen pt-32 pb-24 bg-background">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-lg bg-primary/20 text-sm font-semibold tracking-wide">
              VALLEY | SAT
            </div>
            <div className="text-sm text-muted-foreground">Admin access bar</div>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Secret key:</span> <span className="font-semibold">882336201</span>
          </div>
        </div>

        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6">
            <Shield className="w-4 h-4 text-red-400" />
            <span className="text-sm text-muted-foreground">Administrative Access</span>
          </div>
          <h1 className="text-5xl lg:text-6xl mb-4 text-white">Admin Panel</h1>
          <p className="text-xl text-muted-foreground">Manage tests, questions, and student results.</p>
        </div>

        {flash && (
          <div className="mb-6 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-green-200">
            {flash}
          </div>
        )}

        <Tabs defaultValue="tests" className="space-y-8">
          <TabsList className="bg-card border border-white/10 p-1">
            <TabsTrigger value="tests" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <FileText className="w-4 h-4 mr-2" /> Tests
            </TabsTrigger>
            <TabsTrigger value="questions" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <Database className="w-4 h-4 mr-2" /> Questions
            </TabsTrigger>
            <TabsTrigger value="results" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <Award className="w-4 h-4 mr-2" /> Results
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <UserRound className="w-4 h-4 mr-2" /> Users
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tests">
            <div className="bg-card border border-white/10 rounded-3xl p-8 lg:p-12">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Plus className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl text-white">Manage Practice Tests</h2>
                  <p className="text-muted-foreground">Create or edit practice tests</p>
                </div>
              </div>

              <div className="space-y-6 max-w-3xl">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Test Title</label>
                  <Input value={testTitle} onChange={e => setTestTitle(e.target.value)} placeholder="e.g., Practice Test 1" className="bg-white/5 border-white/10 h-12 text-white" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Difficulty</label>
                    <select value={testDifficulty} onChange={e => setTestDifficulty(e.target.value)} className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-lg text-white">
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] uppercase text-muted-foreground">Math</label>
                      <Input value={mathq} onChange={e => setMathq(e.target.value)} className="h-9 bg-white/5 border-white/10 text-white" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase text-muted-foreground">Read</label>
                      <Input value={readingq} onChange={e => setReadingq(e.target.value)} className="h-9 bg-white/5 border-white/10 text-white" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase text-muted-foreground">Write</label>
                      <Input value={writingq} onChange={e => setWritingq(e.target.value)} className="h-9 bg-white/5 border-white/10 text-white" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Description</label>
                  <Textarea value={testDescription} onChange={e => setTestDescription(e.target.value)} className="bg-white/5 border-white/10 min-h-24 text-white" />
                </div>
                <div className="flex gap-4">
                  <Button onClick={handleAddTest} className="bg-primary text-primary-foreground">
                    {editingTestId ? <Save className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                    {editingTestId ? 'Update' : 'Create'}
                  </Button>
                  {editingTestId && <Button variant="outline" onClick={resetTestForm}>Cancel</Button>}
                </div>

                <div className="mt-12 space-y-4">
                  <h3 className="text-lg text-white">Existing Tests</h3>
                  <div className="grid gap-3">
                    {tests.map(t => (
                      <div key={t.id} className="p-4 rounded-xl border border-white/10 bg-white/5 flex items-center justify-between group">
                        <div>
                          <div className="font-medium text-white">{t.title}</div>
                          <div className="text-xs text-muted-foreground">{t.difficulty} • {t.mathq}M / {t.readingq}R / {t.writingq}W</div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleEditTest(t)} className="p-2 rounded-lg hover:bg-white/10 text-blue-400"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => handleDeleteTest(t.id)} className="p-2 rounded-lg hover:bg-white/10 text-red-400"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="questions">
            <div className="bg-card border border-white/10 rounded-3xl p-8 lg:p-12">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Database className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl text-white">Question Bank</h2>
                  <p className="text-muted-foreground">Add or edit questions for practice tests</p>
                </div>
              </div>

              <div className="space-y-6 max-w-3xl">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Subject</label>
                    <div className="flex p-1 bg-white/5 border border-white/10 rounded-xl">
                      <button onClick={() => setQuestionSubject('rw')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${questionSubject === 'rw' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-white'}`}>RW</button>
                      <button onClick={() => setQuestionSubject('math')} className={`flex-1 py-1 rounded-lg text-sm font-bold transition-all ${questionSubject === 'math' ? 'bg-amber-500/20 text-amber-500' : 'text-muted-foreground hover:text-white'}`}>Math</button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Module</label>
                    <select value={moduleType} onChange={e => setModuleType(e.target.value as any)} className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-lg text-white">
                      <option value="m1">Module 1</option>
                      <option value="m2-easy">Module 2 (Easy)</option>
                      <option value="m2-hard">Module 2 (Hard)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Test Link</label>
                    <select value={selectedTestId} onChange={e => setSelectedTestId(e.target.value)} className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-lg text-white">
                      <option value="">Independent</option>
                      {tests.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Type & Skill</label>
                    <div className="flex gap-2">
                      <select value={questionType} onChange={e => setQuestionType(e.target.value as any)} className="flex-1 h-12 px-4 bg-white/5 border border-white/10 rounded-lg text-white">
                        <option value="multiple-choice">MCQ</option>
                        <option value="numeric">SPR</option>
                      </select>
                      <Input value={testedSkill} onChange={e => setTestedSkill(e.target.value)} placeholder="Skill..." className="flex-1 bg-white/5 border-white/10 h-12" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Passage & Question</label>
                  <Textarea value={passage} onChange={e => setPassage(e.target.value)} placeholder="Passage..." className="bg-white/5 border-white/10 min-h-24 text-white mb-2" />

                  <div className="flex gap-4 items-center mb-2">
                    <div className="flex-1">
                      <label className="text-[10px] uppercase text-muted-foreground block mb-1">Graph/Figure (Passage Image)</label>
                      <Input type="file" onChange={handleImageChange} className="bg-white/5 border-white/10 h-10 file:bg-primary/20 file:text-primary file:border-0 cursor-pointer text-xs" />
                    </div>
                    {questionImagePreview && <img src={questionImagePreview} className="w-12 h-12 rounded border border-white/10 object-cover" />}
                  </div>

                  <Textarea value={questionText} onChange={e => setQuestionText(e.target.value)} placeholder="Question..." className="bg-white/5 border-white/10 min-h-20 text-white" />
                </div>

                {questionType === 'multiple-choice' && (
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { state: optionA, setState: setOptionA, key: 'A', idx: 0 },
                      { state: optionB, setState: setOptionB, key: 'B', idx: 1 },
                      { state: optionC, setState: setOptionC, key: 'C', idx: 2 },
                      { state: optionD, setState: setOptionD, key: 'D', idx: 3 },
                    ].map(opt => (
                      <div key={opt.key} className="space-y-2">
                        <label className="text-xs text-muted-foreground">Choice {opt.key}</label>
                        <div className="flex gap-2">
                          <Input value={opt.state} onChange={e => opt.setState(e.target.value)} className="bg-white/5 border-white/10 h-11 text-sm text-white" />
                          {questionSubject === 'math' && (
                            <div className="relative">
                              <Input type="file" id={`opt-${opt.idx}`} className="hidden" onChange={e => handleOptionImageChange(opt.idx, e)} />
                              <label htmlFor={`opt-${opt.idx}`} className="flex items-center justify-center w-11 h-11 rounded-lg bg-white/5 border border-white/10 cursor-pointer hover:border-primary/50 text-muted-foreground hover:text-white transition-colors">
                                <Plus className="w-4 h-4" />
                              </label>
                              {optionImagePreviews[opt.idx] && (
                                <img src={optionImagePreviews[opt.idx]!} className="absolute -top-1 -right-1 w-5 h-5 rounded-full border border-white/40 object-cover" />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Correct Answer</label>
                    {questionType === 'multiple-choice' ? (
                      <select value={correctAnswer} onChange={e => setCorrectAnswer(e.target.value)} className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-lg text-white font-bold">
                        <option value="">-</option>
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="D">D</option>
                      </select>
                    ) : (
                      <Input value={correctAnswer} onChange={e => setCorrectAnswer(e.target.value)} placeholder="0.5, 3/4..." className="bg-white/5 border-white/10 h-12 text-white font-mono" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Explanation</label>
                    <Textarea value={explanation} onChange={e => setExplanation(e.target.value)} className="bg-white/5 border-white/10 min-h-12 h-12 text-white text-sm" />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button onClick={handleAddQuestion} className="bg-primary text-primary-foreground min-w-[140px]">
                    {editingQuestionId ? <Save className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                    {editingQuestionId ? 'Update' : 'Add'}
                  </Button>
                  <Button variant="outline" onClick={resetQuestionForm} className="border-white/10 hover:bg-white/5">Clear</Button>
                </div>

                <div className="mt-12 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg text-white">Question Bank ({questions.length})</h3>
                    <div className="flex gap-2">
                      <select value={questionFilterSubject} onChange={e => setQuestionFilterSubject(e.target.value)} className="h-9 bg-white/5 border border-white/10 rounded-md px-2 text-xs text-white">
                        <option value="">All Subjects</option>
                        <option value="rw">RW only</option>
                        <option value="math">Math only</option>
                      </select>
                      <select value={questionFilterTestId} onChange={e => setQuestionFilterTestId(e.target.value)} className="h-9 bg-white/5 border border-white/10 rounded-md px-2 text-xs text-white">
                        <option value="">All Tests</option>
                        {tests.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {questions
                      .filter(q => !questionFilterTestId || q.testId === questionFilterTestId)
                      .filter(q => !questionFilterSubject || q.subject === questionFilterSubject)
                      .map(q => (
                        <div key={q.id} className="p-4 rounded-xl border border-white/10 bg-white/5 relative group">
                          <div className="flex gap-4">
                            {q.imageUrl && <img src={`${apiBase}${q.imageUrl}`} className="w-16 h-16 rounded object-cover bg-white/5" />}
                            <div className="flex-1">
                              <div className="text-white text-sm line-clamp-2 mb-2">{q.text}</div>
                              <div className="flex gap-2">
                                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 uppercase">{q.module}</span>
                                <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 uppercase">{q.subject}</span>
                                <span className="text-[10px] px-2 py-0.5 rounded bg-primary/20 text-primary">Ans: {q.answer}</span>
                              </div>
                            </div>
                          </div>
                          <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEditQuestion(q)} className="p-1.5 rounded-md hover:bg-white/10 text-blue-400"><Edit className="w-3.5 h-3.5" /></button>
                            <button onClick={() => handleDeleteQuestion(q.id)} className="p-1.5 rounded-md hover:bg-white/10 text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="results">
            <div className="bg-card border border-white/10 rounded-3xl p-8 lg:p-12">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Award className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl text-white">Student Success</h2>
                  <p className="text-muted-foreground">Add student results for the spotlight</p>
                </div>
              </div>
              <div className="space-y-6 max-w-3xl">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Name</label>
                    <Input value={studentName} onChange={e => setStudentName(e.target.value)} placeholder="e.g., Jane D." className="bg-white/5 border-white/10 text-white h-12" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Score</label>
                    <Input value={studentScore} onChange={e => setStudentScore(e.target.value)} placeholder="1600" className="bg-white/5 border-white/10 text-white h-12" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Photo URL (Preview)</label>
                  <Input value={studentPhotoPreview || ''} onChange={e => setStudentPhotoPreview(e.target.value)} placeholder="https://..." className="bg-white/5 border-white/10 text-white h-12" />
                </div>
                <Button onClick={handleAddResult} className="bg-primary text-primary-foreground min-w-[140px]">
                  {editingResultId ? <Save className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  {editingResultId ? 'Update' : 'Add'}
                </Button>

                <div className="grid grid-cols-2 gap-3 mt-8">
                  {results.map(r => (
                    <div key={r.id} className="p-4 rounded-xl border border-white/10 bg-white/5 flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 overflow-hidden border border-white/10">
                          {r.photoUrl && <img src={r.photoUrl} className="w-full h-full object-cover" />}
                        </div>
                        <div>
                          <div className="text-white font-medium text-sm">{r.name}</div>
                          <div className="text-primary text-xs font-bold">{r.score}</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleEditResult(r)} className="p-1.5 rounded hover:bg-white/10 text-blue-400"><Edit className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDeleteResult(r.id)} className="p-1.5 rounded hover:bg-white/10 text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="users">
            <div className="bg-card border border-white/10 rounded-3xl p-8 lg:p-12">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <UserRound className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl text-white">Registered Users</h2>
                  <p className="text-muted-foreground">View and manage users</p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchUsers} disabled={usersLoading} className="ml-auto border-white/10">
                  <RefreshCw className={`w-4 h-4 mr-2 ${usersLoading ? 'animate-spin' : ''}`} /> Refresh
                </Button>
              </div>

              {usersError && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-6">{usersError}</div>}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {users?.map(user => (
                  <div key={user.uid} className="p-4 rounded-xl border border-white/10 bg-white/5">
                    <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-bold">UID: {user.uid.slice(0, 8)}...</div>
                    <div className="text-white font-medium mb-1 truncate">{user.email}</div>
                    <div className="text-[10px] text-muted-foreground italic">Last login: {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}</div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-12 bg-red-500/5 border border-red-500/20 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <Shield className="w-6 h-6 text-red-400 mt-0.5" />
            <div>
              <h3 className="text-lg text-red-400 font-medium mb-1">Administrator Access Only</h3>
              <p className="text-sm text-muted-foreground">This area is restricted. All actions are monitored for security.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
