import { useEffect, useState } from 'react';
import { Shield, Plus, FileText, Award, Database, UserRound, Users, RefreshCw, Trash2, Edit, Save, X as CloseIcon, Sparkles } from 'lucide-react';
import { OlympiadAdminPage } from './OlympiadAdminPage';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { supabase } from '../../lib/supabase';
import { MathText } from '../ui/MathText';

interface AdminPageProps {
  onNavigate: (page: string) => void;
}

const MathSymbolBar = ({ onInsert }: { onInsert: (symbol: string) => void }) => {
  const symbols = [
    { label: '√', value: '\\sqrt{}' },
    { label: 'x²', value: '^2' },
    { label: 'xⁿ', value: '^{}' },
    { label: 'π', value: '\\pi' },
    { label: '±', value: '\\pm' },
    { label: 'θ', value: '\\theta' },
    { label: 'Δ', value: '\\Delta' },
    { label: '≈', value: '\\approx' },
    { label: '≠', value: '\\neq' },
    { label: '≤', value: '\\leq' },
    { label: '≥', value: '\\geq' },
    { label: 'fraction', value: '\\frac{}{}' },
    { label: '$...$', value: '$ $' },
  ];

  return (
    <div className="flex flex-wrap gap-1.5 p-2 bg-indigo-500/5 border border-indigo-500/10 rounded-xl mb-3 shadow-inner group">
      <div className="text-[9px] uppercase font-black text-indigo-400/60 w-full mb-1 ml-1 flex items-center gap-1.5">
        <Sparkles className="w-2.5 h-2.5" /> Math Quick-Insert
      </div>
      {symbols.map((s) => (
        <button
          key={s.label}
          type="button"
          onClick={() => onInsert(s.value)}
          className="px-2.5 py-1.5 text-xs font-mono bg-white/5 hover:bg-amber-500/20 hover:text-amber-500 hover:border-amber-500/30 border border-white/10 rounded-lg text-muted-foreground transition-all duration-200"
          title={s.value}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
};

export function AdminPage({ onNavigate }: AdminPageProps) {
  const [testTitle, setTestTitle] = useState('');
  const [testDifficulty, setTestDifficulty] = useState('Medium');
  const [testDescription, setTestDescription] = useState('');
  const [mathq, setMathq] = useState('44');
  const [readingq, setReadingq] = useState('54');
  const [writingq, setWritingq] = useState('0'); // Added missing state
  const [questionText, setQuestionText] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentScore, setStudentScore] = useState('');
  const [studentPhoto, setStudentPhoto] = useState<File | null>(null);
  const [studentPhotoPreview, setStudentPhotoPreview] = useState<string | null>(null);
  const [studentQuote, setStudentQuote] = useState(''); // Renamed from studentNote
  const [isOlympiad, setIsOlympiad] = useState(false);
  const [olympiadEndDate, setOlympiadEndDate] = useState('');
  const [tests, setTests] = useState<Array<{ id: string; title: string; difficulty: string; mathq?: string; readingq?: string; writingq?: string; is_olympiad?: boolean; olympiad_end_date?: string }>>([]);
  const [questions, setQuestions] = useState<Array<any>>([]);
  const [results, setResults] = useState<Array<any>>([]);
  const [selectedTestId, setSelectedTestId] = useState('');
  const [passage, setPassage] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [optionC, setOptionC] = useState('');
  const [optionD, setOptionD] = useState('');
  const [showUploadInfo, setShowUploadInfo] = useState(false);
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
  const [highScores, setHighScores] = useState('42');
  const [scoreVariance, setScoreVariance] = useState('+178');
  const [architecturalMean, setArchitecturalMean] = useState('1547');
  const [questionFilterTestId, setQuestionFilterTestId] = useState<string>('');
  const [questionFilterSubject, setQuestionFilterSubject] = useState<string>('');
  const [questionFilterModule, setQuestionFilterModule] = useState<string>('');
  const [flash, setFlash] = useState<string | null>(null);
  const [users, setUsers] = useState<Array<{ uid: string; email: string; lastLogin?: string }> | null>(null);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [teachers, setTeachers] = useState<Array<{ id: string; email: string; full_name?: string }>>([]);
  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');
  const [teachersLoading, setTeachersLoading] = useState(false);
  const [invites, setInvites] = useState<Array<any>>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);

  // Site Content Management
  const [siteContent, setSiteContent] = useState<any>({});
  const [contentLoading, setContentLoading] = useState(false);

  const showFlash = (message: string) => {
    setFlash(message);
    setTimeout(() => setFlash(null), 3000);
  };

  const apiBase = (import.meta as any).env?.VITE_BACKEND_URL || '';
  const adminUsersEndpoint = `${apiBase}/listUsers`;

  const fetchUsers = async () => {
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

  const fetchTeachers = async () => {
    setTeachersLoading(true);
    try {
      const data = await authedRequest('/api/admin/teachers');
      setTeachers(data.teachers || []);
    } catch (err: any) {
      showFlash(`Failed to load teachers: ${err.message}`);
    } finally {
      setTeachersLoading(false);
    }
  };

  const fetchInvites = async () => {
    setInvitesLoading(true);
    try {
      const data = await authedRequest('/api/admin/teacher-invites');
      setInvites(data.invites || []);
    } catch (err: any) {
      showFlash(`Failed to load invites: ${err.message}`);
    } finally {
      setInvitesLoading(false);
    }
  };

  const generateInvite = async () => {
    try {
      const data = await authedRequest('/api/admin/teacher-invites', { method: 'POST' });
      setInvites([data.invite, ...invites]);
      showFlash('Invite code generated!');
    } catch (err: any) {
      showFlash(`Failed to generate invite: ${err.message}`);
    }
  };

  useEffect(() => {
    const init = async () => {
      await loadData();
      await fetchUsers();
      await fetchTeachers();
      await fetchInvites();
    };
    init();
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
      const [testsRes, questionsRes, resultsRes, settingsRes] = await Promise.all([
        fetch(`${apiBase}/api/tests`).then((r) => r.json()).catch(() => ({ tests: [] })),
        fetch(`${apiBase}/api/questions`).then((r) => r.json()).catch(() => ({ questions: [] })),
        fetch(`${apiBase}/api/results`).then((r) => r.json()).catch(() => ({ results: [] })),
        fetch(`${apiBase}/api/settings`).then((r) => r.json()).catch(() => ({ settings: null })),
      ]);
      const s = settingsRes.settings;
      if (s) {
        setHighScores(String(s.high_scores));
        setScoreVariance(String(s.score_variance));
        setArchitecturalMean(String(s.architectural_mean));
      }
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


  const handleAddTest = () => {
    if (!testTitle) {
      showFlash('Add a test title first.');
      return;
    }

    const payload = {
      title: testTitle,
      difficulty: testDifficulty,
      description: testDescription,
      sections: [`Math: ${mathq}Q`, `Reading & Writing: ${readingq}Q`],
      mathq,
      readingq,
      writingq,
      is_olympiad: isOlympiad,
      olympiad_end_date: olympiadEndDate || undefined
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
    setMathq('44');
    setReadingq('54');
    setWritingq('0');
    setIsOlympiad(false);
    setOlympiadEndDate('');
    setEditingTestId(null);
  };

  const handleEditTest = (t: any) => {
    setEditingTestId(t.id);
    setTestTitle(t.title || '');
    setTestDifficulty(t.difficulty || 'Medium');
    setTestDescription(t.description || '');
    setMathq(t.mathq || '44');
    setReadingq(t.readingq || '54');
    setWritingq(t.writingq || '0');
    setIsOlympiad(t.is_olympiad || false);
    setOlympiadEndDate(t.olympiad_end_date ? t.olympiad_end_date.split('T')[0] : '');
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

  const handleRemoveQuestionImage = () => {
    setQuestionImage(null);
    setQuestionImagePreview(null);
  };

  const handleRemoveOptionImage = (index: number) => {
    const newImages = [...optionImages];
    newImages[index] = null;
    setOptionImages(newImages);

    const newPreviews = [...optionImagePreviews];
    newPreviews[index] = null;
    setOptionImagePreviews(newPreviews);
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
    // Do not scroll anywhere, allow inline editing.
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
    const payload = { name: studentName, score: studentScore, note: studentQuote, photoUrl: studentPhotoPreview || undefined }; // Mapping quote to note column

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
    setStudentQuote('');
    setEditingResultId(null);
  };

  const handleEditResult = (r: any) => {
    setEditingResultId(r.id);
    setStudentName(r.name || '');
    setStudentScore(r.score || '');
    setStudentQuote(r.note || '');
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

  const handleUpdateSettings = async () => {
    try {
      await authedRequest('/api/settings', {
        method: 'PUT',
        body: JSON.stringify({
          high_scores: parseInt(highScores) || 0,
          score_variance: scoreVariance,
          architectural_mean: parseInt(architecturalMean) || 0
        }),
      });
      showFlash('Settings updated.');
    } catch (err: any) {
      showFlash(err.message);
    }
  };

  const handleAddTeacher = async () => {
    if (!teacherEmail) return;
    try {
      // If password is provided, use the create endpoint
      if (teacherPassword) {
        await authedRequest('/api/admin/teachers/create', {
          method: 'POST',
          body: JSON.stringify({
            email: teacherEmail,
            password: teacherPassword,
            full_name: teacherName || 'Teacher'
          }),
        });
      } else {
        // Otherwise, grant role to existing user
        await authedRequest('/api/admin/teachers', {
          method: 'POST',
          body: JSON.stringify({ email: teacherEmail }),
        });
      }

      setTeacherEmail('');
      setTeacherName('');
      setTeacherPassword('');
      await fetchTeachers();
      showFlash(teacherPassword ? 'Teacher account created.' : 'Teacher role granted.');
    } catch (err: any) {
      showFlash(err.message);
    }
  };

  const handleRevokeTeacher = async (id: string) => {
    if (!window.confirm('Revoke teacher privileges?')) return;
    try {
      await authedRequest(`/api/admin/teachers/${id}`, {
        method: 'DELETE',
      });
      await fetchTeachers();
      showFlash('Teacher role revoked.');
    } catch (err: any) {
      showFlash(err.message);
    }
  };

  const renderQuestionForm = () => (
    <div className="space-y-6 max-w-3xl animate-in fade-in slide-in-from-top-4 duration-300">
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
            {tests.map(t => <option key={t.id} value={t.id}>{t.title} {t.is_olympiad ? '(Olympiad)' : ''}</option>)}
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

      <div className="space-y-4">
        <label className="text-sm text-muted-foreground flex items-center justify-between">
          Passage & Question
          {questionSubject === 'math' && <span className="text-[10px] text-amber-500 uppercase font-bold">LaTeX Enabled</span>}
        </label>

        {questionSubject === 'math' && (
          <MathSymbolBar onInsert={(s) => setPassage(prev => prev + s)} />
        )}
        <Textarea value={passage} onChange={e => setPassage(e.target.value)} placeholder="Passage..." className="bg-white/5 border-white/10 min-h-24 text-white mb-2" />

        <div className="flex gap-4 items-center mb-2">
          <div className="flex-1">
            <label className="text-[10px] uppercase text-muted-foreground block mb-1">Graph/Figure (Passage Image)</label>
            <Input type="file" onChange={handleImageChange} className="bg-white/5 border-white/10 h-10 file:bg-primary/20 file:text-primary file:border-0 cursor-pointer text-xs" />
          </div>
          {questionImagePreview && (
            <div className="relative">
              <img src={questionImagePreview} className="w-12 h-12 rounded border border-white/10 object-cover" />
              <button
                onClick={handleRemoveQuestionImage}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 border border-background shadow-sm"
              >
                <CloseIcon className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {questionSubject === 'math' && (
          <MathSymbolBar onInsert={(s) => setQuestionText(prev => prev + s)} />
        )}
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
              <label className="text-xs text-muted-foreground flex items-center justify-between">
                Choice {opt.key}
                {questionSubject === 'math' && <button type="button" onClick={() => opt.setState(opt.state + '$ $')} className="text-[10px] text-amber-500 hover:underline">Add $ $</button>}
              </label>
              <div className="flex flex-col gap-2">
                {questionSubject === 'math' && (
                  <MathSymbolBar onInsert={(s) => opt.setState(opt.state + s)} />
                )}
                <div className="flex gap-2">
                  <Input value={opt.state} onChange={e => opt.setState(e.target.value)} className="bg-white/5 border-white/10 h-11 text-sm text-white" />
                  {questionSubject === 'math' && (
                    <div className="relative">
                      <Input type="file" id={`opt-${opt.idx}`} className="hidden" onChange={e => handleOptionImageChange(opt.idx, e)} />
                      <label htmlFor={`opt-${opt.idx}`} className="flex items-center justify-center w-11 h-11 rounded-lg bg-white/5 border border-white/10 cursor-pointer hover:border-primary/50 text-muted-foreground hover:text-white transition-colors">
                        <Plus className="w-4 h-4" />
                      </label>
                      {optionImagePreviews[opt.idx] && (
                        <>
                          <img src={optionImagePreviews[opt.idx]!} className="absolute -top-1 -right-1 w-5 h-5 rounded-full border border-white/40 object-cover" />
                          <button
                            onClick={() => handleRemoveOptionImage(opt.idx)}
                            className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 border border-background z-10 shadow-sm"
                          >
                            <CloseIcon className="w-2.5 h-2.5" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
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
          {questionSubject === 'math' && (
            <MathSymbolBar onInsert={(s) => setExplanation(prev => prev + s)} />
          )}
          <Textarea value={explanation} onChange={e => setExplanation(e.target.value)} className="bg-white/5 border-white/10 min-h-12 h-12 text-white text-sm" />
        </div>
      </div>

      <div className="flex gap-4 pt-4">
        <Button onClick={handleAddQuestion} className="bg-primary text-primary-foreground min-w-[140px]">
          {editingQuestionId ? <Save className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
          {editingQuestionId ? 'Update' : 'Add'}
        </Button>
        <Button variant="outline" onClick={resetQuestionForm} className="border-white/10 hover:bg-white/5">Cancel</Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pt-32 pb-24 bg-background">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-lg bg-primary/20 text-sm font-semibold tracking-wide">
              VALLEY | SAT
            </div>
            <div className="text-sm text-muted-foreground mr-4">Admin access bar</div>
            <Button onClick={() => onNavigate('dashboard')} variant="ghost" className="h-8 px-3 text-xs font-bold text-indigo-400 hover:text-indigo-300 hover:bg-white/5 border border-indigo-400/20 rounded-lg">
              ← Back to Dashboard
            </Button>
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
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-5xl lg:text-6xl text-white">Admin Panel</h1>
            <div className="flex gap-4">
              <Button
                onClick={() => onNavigate('admin-import')}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-6 rounded-xl text-lg relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <Sparkles className="w-6 h-6 mr-3 relative z-10" />
                <span className="relative z-10">AI Import Center</span>
              </Button>
              <Button
                onClick={() => onNavigate('admin-olympiad')}
                className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-6 py-6 rounded-xl text-lg relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <Award className="w-6 h-6 mr-3 relative z-10" />
                <span className="relative z-10">Manage Olympiad</span>
              </Button>
            </div>
          </div>
          <p className="text-xl text-muted-foreground mr-auto">Manage tests, questions, and student results.</p>
          <button
            onClick={() => setShowUploadInfo(!showUploadInfo)}
            className="mt-4 text-xs font-bold text-primary hover:underline flex items-center gap-1"
          >
            How do I upload pictures? {showUploadInfo ? '↑' : '↓'}
          </button>

          {showUploadInfo && (
            <div className="mt-4 p-4 rounded-xl bg-primary/10 border border-primary/20 text-xs text-muted-foreground animate-in slide-in-from-top-2">
              <p className="font-bold text-white mb-2 underline">Picture Upload Protocol:</p>
              <ul className="space-y-1 list-disc ml-4">
                <li><span className="text-white">Questions/Passages:</span> Use the "Graph/Figure" file input. It automatically uploads to our secure storage.</li>
                <li><span className="text-white">Math Options:</span> Click the [+] icon next to the option text to upload an image for that specific choice.</li>
                <li><span className="text-white">Student Results:</span> Paste the direct link to the image in the "Photo URL" field. You can use services like PostImages or Imgur.</li>
              </ul>
            </div>
          )}
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
            <TabsTrigger value="olympiad" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <Award className="w-4 h-4 mr-2" /> Olympiad
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <UserRound className="w-4 h-4 mr-2" /> Users
            </TabsTrigger>
            <TabsTrigger value="teachers" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-xl gap-2 transition-all">
              <Users className="w-4 h-4" /> Teachers
            </TabsTrigger>
            <TabsTrigger value="invites" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-xl gap-2 transition-all">
              <Plus className="w-4 h-4" /> Invites
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-xl gap-2 transition-all">
              <RefreshCw className="w-4 h-4 mr-2" /> Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tests">
            <div className="bg-card border border-white/10 rounded-3xl p-8 lg:p-12">
              <div className="flex items-center justify-between mb-12">
                <h1 className="text-4xl font-black tracking-tight text-white flex items-center gap-4">
                  <Shield className="w-10 h-10 text-indigo-500" />
                  Command Center
                </h1>
                <div className="text-right">
                  <div className="text-sm font-bold text-white">Admin Access</div>
                  <div className="text-xs text-indigo-400 font-mono">SECURE_MODE_ACTIVE</div>
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
                      <label className="text-[10px] uppercase text-muted-foreground">Reading & Writing</label>
                      <Input value={readingq} onChange={e => setReadingq(e.target.value)} className="h-9 bg-white/5 border-white/10 text-white" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Description</label>
                  <Textarea value={testDescription} onChange={e => setTestDescription(e.target.value)} className="bg-white/5 border-white/10 min-h-24 text-white" />
                </div>
                <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm text-indigo-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isOlympiad}
                        onChange={e => setIsOlympiad(e.target.checked)}
                        className="w-4 h-4 rounded border-white/10 bg-white/5 text-indigo-600 focus:ring-indigo-500"
                      />
                      Mark as SAT Olympiad Test
                    </label>
                    <p className="text-[10px] text-indigo-200/40 uppercase tracking-widest pl-6">This test will appear in the Olympiad section.</p>
                  </div>
                  {isOlympiad && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-left-2 transition-all">
                      <label className="text-sm text-muted-foreground">Olympiad End Date</label>
                      <Input
                        type="date"
                        value={olympiadEndDate}
                        onChange={e => setOlympiadEndDate(e.target.value)}
                        className="bg-white/5 border-white/10 h-10 text-white"
                      />
                    </div>
                  )}
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
                          <div className="text-xs text-muted-foreground">{t.difficulty} • {t.mathq}M / {t.readingq}RW</div>
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

              {/* Question Summary Dashboard */}
              {(() => {
                const filtered = questions.filter(q => !questionFilterTestId || q.testId === questionFilterTestId);
                const stats = {
                  total: filtered.length,
                  math: filtered.filter(q => q.subject === 'math').length,
                  rw: filtered.filter(q => q.subject === 'rw' || q.subject === 'reading' || q.subject === 'writing').length,
                  m1: filtered.filter(q => q.module === 'm1').length,
                  m2: filtered.filter(q => q.module?.startsWith('m2')).length,
                  m2Hard: filtered.filter(q => q.module === 'm2-hard').length,
                  m2Easy: filtered.filter(q => q.module === 'm2-easy').length,
                };

                return (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-primary/50 transition-colors group">
                      <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1 flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" /> Total Questions
                      </div>
                      <div className="text-3xl font-black text-white">{stats.total}</div>
                      <div className="mt-2 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: '100%' }} />
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-500/50 transition-colors">
                      <div className="text-[10px] uppercase font-bold text-amber-500/60 mb-1">Math Questions</div>
                      <div className="text-3xl font-black text-white">{stats.math}</div>
                      <div className="mt-2 text-[10px] text-muted-foreground">
                        M1: <span className="text-white">{filtered.filter(q => q.subject === 'math' && q.module === 'm1').length}</span> |
                        M2: <span className="text-white">{filtered.filter(q => q.subject === 'math' && q.module?.startsWith('m2')).length}</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-blue-500/50 transition-colors">
                      <div className="text-[10px] uppercase font-bold text-blue-500/60 mb-1">RW Questions</div>
                      <div className="text-3xl font-black text-white">{stats.rw}</div>
                      <div className="mt-2 text-[10px] text-muted-foreground">
                        M1: <span className="text-white">{filtered.filter(q => (q.subject === 'rw' || q.subject === 'reading' || q.subject === 'writing') && q.module === 'm1').length}</span> |
                        M2: <span className="text-white">{filtered.filter(q => (q.subject === 'rw' || q.subject === 'reading' || q.subject === 'writing') && q.module?.startsWith('m2')).length}</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-indigo-500/50 transition-colors">
                      <div className="text-[10px] uppercase font-bold text-indigo-500/60 mb-1">Module Balance</div>
                      <div className="text-3xl font-black text-white">{stats.m1}<span className="text-sm font-normal text-muted-foreground mx-1">/</span>{stats.m2}</div>
                      <div className="mt-2 text-[10px] text-muted-foreground">
                        M1 Total vs M2 (Hard+Easy)
                      </div>
                    </div>
                  </div>
                );
              })()}

              {!editingQuestionId && (
                <div className="mb-12">
                  <h3 className="text-lg font-bold text-white mb-6">Create New Question</h3>
                  {renderQuestionForm()}
                </div>
              )}

              <div className="mt-12 space-y-4 max-w-3xl">
                <div className="space-y-6 mb-8">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h3 className="text-xl text-white font-bold flex items-center gap-2">
                      Question Bank
                      <span className="text-xs font-normal text-muted-foreground bg-white/5 px-2 py-0.5 rounded-full">
                        {questions.filter(q =>
                          (!questionFilterTestId || q.testId === questionFilterTestId) &&
                          (!questionFilterSubject || q.subject === questionFilterSubject) &&
                          (!questionFilterModule || q.module === questionFilterModule)
                        ).length} Questions
                      </span>
                    </h3>
                    <select value={questionFilterTestId} onChange={e => setQuestionFilterTestId(e.target.value)} className="h-10 bg-white/5 border border-white/10 rounded-lg px-4 text-sm text-white min-w-[200px]">
                      <option value="">All Tests</option>
                      {tests.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/5 border border-white/10 p-4 rounded-2xl">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">1. Select Subject</label>
                      <div className="flex gap-2">
                        {[
                          { id: '', label: 'All' },
                          { id: 'math', label: 'Math', color: 'amber' },
                          { id: 'rw', label: 'English (RW)', color: 'blue' }
                        ].map(s => (
                          <button
                            key={s.id}
                            onClick={() => { setQuestionFilterSubject(s.id); setQuestionFilterModule(''); }}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all border ${questionFilterSubject === s.id
                              ? (s.color === 'amber' ? 'bg-amber-500/20 border-amber-500/50 text-amber-500' : s.color === 'blue' ? 'bg-blue-500/20 border-blue-500/50 text-blue-500' : 'bg-primary/20 border-primary/50 text-primary')
                              : 'bg-white/5 border-white/10 text-muted-foreground hover:text-white hover:border-white/20'
                              }`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">2. Select Module</label>
                      <div className="flex gap-2">
                        {[
                          { id: '', label: 'All' },
                          { id: 'm1', label: 'M1' },
                          { id: 'm2-hard', label: 'M2-H' },
                          { id: 'm2-easy', label: 'M2-E' }
                        ].map(m => (
                          <button
                            key={m.id}
                            onClick={() => setQuestionFilterModule(m.id)}
                            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all border ${questionFilterModule === m.id
                              ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400'
                              : 'bg-white/5 border-white/10 text-muted-foreground hover:text-white hover:border-white/20'
                              }`}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  {questions
                    .filter(q => !questionFilterTestId || q.testId === questionFilterTestId)
                    .filter(q => !questionFilterSubject || q.subject === questionFilterSubject)
                    .filter(q => !questionFilterModule || q.module === questionFilterModule)
                    .map((q, index) => {
                      const isEditingThis = editingQuestionId === q.id;

                      if (isEditingThis) {
                        return (
                          <div key={q.id} className="p-6 rounded-2xl border-2 border-primary/50 bg-primary/5 relative">
                            <h4 className="text-white font-bold mb-6 flex items-center gap-2">
                              <Edit className="w-5 h-5 text-primary" />
                              Editing Question Inline
                            </h4>
                            {renderQuestionForm()}
                          </div>
                        )
                      }

                      return (
                        <div key={q.id} className="p-4 rounded-xl border border-white/10 bg-white/5 relative group">
                          <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-black text-muted-foreground group-hover:text-primary group-hover:border-primary/50 transition-all z-10 shadow-xl">
                            {index + 1}
                          </div>
                          <div className="flex gap-4">
                            {q.imageUrl && <img src={`${apiBase}${q.imageUrl}`} className="w-16 h-16 rounded object-cover bg-white/5" />}
                            <div className="flex-1">
                              <div className="text-white text-sm line-clamp-2 mb-2">
                                <MathText text={q.text} />
                              </div>
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
                      );
                    })}
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
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Student Name</label>
                    <Input value={studentName} onChange={e => setStudentName(e.target.value)} className="bg-white/5 border-white/10 h-12 text-white" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Score</label>
                    <Input value={studentScore} onChange={e => setStudentScore(e.target.value)} className="bg-white/5 border-white/10 h-12 text-white" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Student Quote</label>
                  <Textarea value={studentQuote} onChange={e => setStudentQuote(e.target.value)} placeholder="e.g., This platform changed my life!" className="bg-white/5 border-white/10 min-h-24 text-white" />
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

          <TabsContent value="teachers">
            <div className="bg-card border border-white/10 rounded-3xl p-8 lg:p-12">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                  <Users className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-2xl text-white">Teacher Management</h2>
                  <p className="text-muted-foreground">Assign teacher roles to users by email</p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchTeachers} disabled={teachersLoading} className="ml-auto border-white/10">
                  <RefreshCw className={`w-4 h-4 mr-2 ${teachersLoading ? 'animate-spin' : ''}`} /> Refresh
                </Button>
              </div>

              <div className="max-w-xl p-6 bg-white/5 border border-white/10 rounded-2xl mb-12">
                <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-widest">Add or Create Teacher</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider ml-1">Email Address</label>
                      <Input
                        value={teacherEmail}
                        onChange={e => setTeacherEmail(e.target.value)}
                        placeholder="teacher@example.com"
                        className="bg-white/5 border-white/10"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider ml-1">Full Name (Optional)</label>
                      <Input
                        value={teacherName}
                        onChange={e => setTeacherName(e.target.value)}
                        placeholder="John Doe"
                        className="bg-white/5 border-white/10"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider ml-1">Password (To create new account)</label>
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        value={teacherPassword}
                        onChange={e => setTeacherPassword(e.target.value)}
                        placeholder="Leave blank to assign role to existing user"
                        className="bg-white/5 border-white/10"
                      />
                      <Button onClick={handleAddTeacher} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8">
                        {teacherPassword ? 'Create' : 'Add'}
                      </Button>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-4 italic leading-relaxed">
                  Tip: If the user doesn't have an account yet, provide a password to create one. If they already signed up, just enter their email to grant the teacher role.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {teachers.map(teacher => (
                  <div key={teacher.id} className="p-4 rounded-xl border border-white/10 bg-white/5 flex items-center justify-between group">
                    <div>
                      <div className="text-white font-bold">{teacher.full_name || 'Unnamed Teacher'}</div>
                      <div className="text-xs text-muted-foreground">{teacher.email}</div>
                    </div>
                    <button
                      onClick={() => handleRevokeTeacher(teacher.id)}
                      className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Revoke Teacher Role"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {teachers.length === 0 && (
                  <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed border-white/5 rounded-3xl">
                    No teachers assigned yet.
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="invites" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-8 bg-[#0a0f1d]/60 border border-white/10 rounded-[2.5rem] backdrop-blur-xl">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-black text-white flex items-center gap-3">
                    <Plus className="text-indigo-400" /> Teacher Invitations
                  </h2>
                  <p className="text-indigo-200/40 text-sm font-bold mt-1">Generate and manage unique codes for inviting new teachers.</p>
                </div>
                <Button onClick={generateInvite} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl h-12 px-6 font-black uppercase tracking-widest text-xs flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Generate New Code
                </Button>
              </div>

              <div className="space-y-4">
                {invitesLoading && <div className="text-center py-12 text-indigo-200/40 animate-pulse">Loading invites...</div>}
                {!invitesLoading && invites.length === 0 && <div className="text-center py-12 text-indigo-400/30 font-bold uppercase tracking-widest italic border-2 border-dashed border-white/5 rounded-3xl">No invitations generated yet</div>}

                {invites.map((invite: any) => (
                  <div key={invite.id} className="p-6 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-between group hover:border-indigo-500/30 transition-all">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-3">
                        <code className="text-xl font-black text-white bg-indigo-500/20 px-3 py-1 rounded-xl border border-indigo-500/20">{invite.code}</code>
                        {invite.used_by ? (
                          <span className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">Used</span>
                        ) : (
                          new Date(invite.expires_at) < new Date() ? (
                            <span className="text-[10px] font-black uppercase text-red-400 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">Expired</span>
                          ) : (
                            <span className="text-[10px] font-black uppercase text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">Active</span>
                          )
                        )}
                      </div>
                      <p className="text-[10px] text-indigo-200/40 font-bold uppercase tracking-[0.2em] mt-1">
                        Expires: {new Date(invite.expires_at).toLocaleDateString()}
                        {invite.profiles && ` • Used by: ${invite.profiles.full_name} (${invite.profiles.email})`}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      className="text-indigo-400 hover:text-white hover:bg-white/5 rounded-xl uppercase text-[10px] font-black tracking-widest"
                      onClick={() => {
                        navigator.clipboard.writeText(invite.code);
                        showFlash('Code copied to clipboard!');
                      }}
                    >
                      Copy Code
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
          <TabsContent value="olympiad">
            <div className="bg-card border border-white/10 rounded-3xl p-8 lg:p-12">
              <OlympiadAdminPage embedded={true} />
            </div>
          </TabsContent>
          <TabsContent value="settings">
            <div className="bg-card border border-white/10 rounded-3xl p-8 lg:p-12">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <RefreshCw className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl text-white">Site Content & Settings</h2>
                  <p className="text-muted-foreground">Customize all text content and prize stickers</p>
                </div>
                <Button onClick={async () => {
                  setContentLoading(true);
                  try {
                    const res = await authedRequest('/api/content');
                    const data = await res.json();
                    setSiteContent(data.content || {});
                  } catch (err) {
                    showFlash('Failed to load content');
                  } finally {
                    setContentLoading(false);
                  }
                }} className="ml-auto">
                  <RefreshCw className="w-4 h-4 mr-2" /> Load Content
                </Button>
              </div>

              <div className="space-y-8 max-w-4xl">
                {/* General Site Content */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-white border-b border-white/10 pb-2">General Site</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">Site Title</label>
                      <Input
                        value={siteContent.site_title || ''}
                        onChange={e => setSiteContent({ ...siteContent, site_title: e.target.value })}
                        className="bg-white/5 border-white/10 text-white h-12"
                        placeholder="SAT Valley"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">Site Tagline</label>
                      <Input
                        value={siteContent.site_tagline || ''}
                        onChange={e => setSiteContent({ ...siteContent, site_tagline: e.target.value })}
                        className="bg-white/5 border-white/10 text-white h-12"
                        placeholder="Master the Digital SAT"
                      />
                    </div>
                  </div>
                </div>

                {/* Hero Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-white border-b border-white/10 pb-2">Hero Section</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">Hero Title</label>
                      <Input
                        value={siteContent.hero_title || ''}
                        onChange={e => setSiteContent({ ...siteContent, hero_title: e.target.value })}
                        className="bg-white/5 border-white/10 text-white h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">Hero Subtitle</label>
                      <Input
                        value={siteContent.hero_subtitle || ''}
                        onChange={e => setSiteContent({ ...siteContent, hero_subtitle: e.target.value })}
                        className="bg-white/5 border-white/10 text-white h-12"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Hero Description</label>
                    <Textarea
                      value={siteContent.hero_description || ''}
                      onChange={e => setSiteContent({ ...siteContent, hero_description: e.target.value })}
                      className="bg-white/5 border-white/10 text-white min-h-[80px]"
                    />
                  </div>
                </div>

                {/* Home Page Statistics */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-white border-b border-white/10 pb-2">📊 Home Page Statistics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-4 p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="text-xs font-black text-indigo-400 uppercase tracking-widest">Card 1</div>
                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground">Value (e.g. 1500+)</label>
                        <Input
                          value={siteContent.stats_1_value || ''}
                          onChange={e => setSiteContent({ ...siteContent, stats_1_value: e.target.value })}
                          className="bg-white/10 border-white/10 text-white h-10"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground">Label (e.g. Students)</label>
                        <Input
                          value={siteContent.stats_1_label || ''}
                          onChange={e => setSiteContent({ ...siteContent, stats_1_label: e.target.value })}
                          className="bg-white/10 border-white/10 text-white h-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-4 p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="text-xs font-black text-indigo-400 uppercase tracking-widest">Card 2</div>
                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground">Value (e.g. 1550+)</label>
                        <Input
                          value={siteContent.stats_2_value || ''}
                          onChange={e => setSiteContent({ ...siteContent, stats_2_value: e.target.value })}
                          className="bg-white/10 border-white/10 text-white h-10"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground">Label (e.g. Students)</label>
                        <Input
                          value={siteContent.stats_2_label || ''}
                          onChange={e => setSiteContent({ ...siteContent, stats_2_label: e.target.value })}
                          className="bg-white/10 border-white/10 text-white h-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-4 p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="text-xs font-black text-indigo-400 uppercase tracking-widest">Card 3</div>
                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground">Value (e.g. 1600)</label>
                        <Input
                          value={siteContent.stats_3_value || ''}
                          onChange={e => setSiteContent({ ...siteContent, stats_3_value: e.target.value })}
                          className="bg-white/10 border-white/10 text-white h-10"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground">Label (e.g. Perfect Scores)</label>
                        <Input
                          value={siteContent.stats_3_label || ''}
                          onChange={e => setSiteContent({ ...siteContent, stats_3_label: e.target.value })}
                          className="bg-white/10 border-white/10 text-white h-10"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Olympiad Section */}

                {/* Prize Stickers */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-white border-b border-white/10 pb-2">🏆 Prize Stickers</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">Prize Text</label>
                      <Input
                        value={siteContent.prize_text || ''}
                        onChange={e => setSiteContent({ ...siteContent, prize_text: e.target.value })}
                        className="bg-white/5 border-white/10 text-white h-12"
                        placeholder="🏆 Win $500 Cash Prize"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">Badge Text</label>
                      <Input
                        value={siteContent.prize_badge || ''}
                        onChange={e => setSiteContent({ ...siteContent, prize_badge: e.target.value })}
                        className="bg-white/5 border-white/10 text-white h-12"
                        placeholder="GRAND PRIZE"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">Badge Style</label>
                      <select
                        value={siteContent.prize_badge_style || 'gold'}
                        onChange={e => setSiteContent({ ...siteContent, prize_badge_style: e.target.value })}
                        className="w-full h-12 bg-white/5 border border-white/10 rounded-md px-3 text-white"
                      >
                        <option value="gold">🥇 Gold</option>
                        <option value="silver">🥈 Silver</option>
                        <option value="bronze">🥉 Bronze</option>
                        <option value="diamond">💎 Diamond</option>
                      </select>
                    </div>
                  </div>
                  {/* Preview */}
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-xs text-muted-foreground mb-2">Preview:</p>
                    <div className="flex items-center gap-3">
                      <div className={`px-4 py-2 rounded-full font-bold text-sm ${siteContent.prize_badge_style === 'gold' ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-black' :
                        siteContent.prize_badge_style === 'silver' ? 'bg-gradient-to-r from-gray-300 to-gray-400 text-black' :
                          siteContent.prize_badge_style === 'bronze' ? 'bg-gradient-to-r from-amber-600 to-orange-700 text-white' :
                            'bg-gradient-to-r from-cyan-400 to-blue-500 text-white'
                        }`}>
                        {siteContent.prize_badge || 'GRAND PRIZE'}
                      </div>
                      <span className="text-white">{siteContent.prize_text || '🏆 Win $500 Cash Prize'}</span>
                    </div>
                  </div>
                </div>

                {/* Statistics */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-white border-b border-white/10 pb-2">Statistics (Results Page)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">High Scores</label>
                      <Input value={highScores} onChange={e => setHighScores(e.target.value)} className="bg-white/5 border-white/10 text-white h-12" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">Variance of Scores</label>
                      <Input value={scoreVariance} onChange={e => setScoreVariance(e.target.value)} className="bg-white/5 border-white/10 text-white h-12" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">Architectural Mean</label>
                      <Input value={architecturalMean} onChange={e => setArchitecturalMean(e.target.value)} className="bg-white/5 border-white/10 text-white h-12" />
                    </div>
                  </div>
                </div>

                {/* Save Buttons */}
                <div className="flex gap-4 pt-4">
                  <Button
                    onClick={async () => {
                      if (contentLoading) return;
                      setContentLoading(true);
                      try {
                        await authedRequest('/api/content', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(siteContent)
                        });
                        showFlash('Site content updated successfully!');
                      } catch (err) {
                        showFlash('Failed to update content');
                      } finally {
                        setContentLoading(false);
                      }
                    }}
                    className="bg-primary text-primary-foreground"
                    disabled={contentLoading}
                  >
                    {contentLoading ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    {contentLoading ? 'Saving...' : 'Save All Content'}
                  </Button>
                  <Button
                    onClick={async () => {
                      if (contentLoading) return;
                      setContentLoading(true);
                      try {
                        await handleUpdateSettings();
                      } finally {
                        setContentLoading(false);
                      }
                    }}
                    variant="outline"
                    className="border-white/10"
                    disabled={contentLoading}
                  >
                    {contentLoading ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    {contentLoading ? 'Saving Statistics...' : 'Save Statistics'}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs >

        <div className="mt-12 bg-red-500/5 border border-red-500/20 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <Shield className="w-6 h-6 text-red-400 mt-0.5" />
            <div>
              <h3 className="text-lg text-red-400 font-medium mb-1">Administrator Access Only</h3>
              <p className="text-sm text-muted-foreground">This area is restricted. All actions are monitored for security.</p>
            </div>
          </div>
        </div>
      </div >
    </div >
  );
}
