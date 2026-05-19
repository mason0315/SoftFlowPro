import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, BookOpen, CheckCircle2, AlertCircle, Award, ArrowRight, Lightbulb, RefreshCcw, Save, History, LogOut, LogIn, FileText, Trash2, ChevronDown, ChevronUp, Copy, Check, Layers, Zap, BarChart2 } from 'lucide-react';
import { auth, db } from './lib/firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User, 
  signOut 
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  serverTimestamp, 
  deleteDoc, 
  doc,
  getDocFromServer,
  setDoc
} from 'firebase/firestore';

// ... existing interfaces ...

interface TranslationSegment {
  text: string;
  type: 'correct' | 'error' | 'scoring' | 'neutral';
  feedback?: string;
  label?: string;
}

interface ScoringPoint {
  point: string;
  yourVersion: string;
  standard: string;
  score: number;
  maxScore: number;
  reason: string;
}

interface KnowledgeItem {
  term: string;
  meanings: string[];
}

interface GradingDetail {
  id: string;
  score: number;
  maxScore: number;
  originalSentence: string;
  yourTranslation: TranslationSegment[];
  missingParts: string[];
  standardAnswer: TranslationSegment[];
  scoringPoints: ScoringPoint[];
  diagnosis: {
    semanticDifference: string;
    logicalBreakdown: string[];
    improvements: string[];
    knowledgeReview: KnowledgeItem[];
  };
}

interface GradeResult {
  totalScore: number;
  overallSummary: string;
  details: GradingDetail[];
}

interface QuestionInput {
  id: string;
  userAnswer: string;
  standardAnswer: string;
}

export default function App() {
  const [fullArticle, setFullArticle] = useState('');
  const [userAnswersBulk, setUserAnswersBulk] = useState('');
  const [standardAnswersBulk, setStandardAnswersBulk] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GradeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('input');
  const [language, setLanguage] = useState<'zh' | 'en'>('zh');

  const t = {
    zh: {
      appName: 'SoftFlow',
      appSuffix: 'Pro',
      appDesc: 'Part C 考研翻译智能诊断系统',
      signIn: '登录账号',
      signOut: '退出',
      input: '原文输入',
      report: '诊断报告',
      historyTitle: '历史记录',
      backToApp: '返回诊断',
      activeSession: '当前会话',
      noHistory: '暂无同步记录',
      fullArticle: '整篇英文上下文 (用于背景语义参考)',
      tagsRequired: '必须包含题号标记 (46)-(50)',
      placeholderArticle: '请粘贴 Part C 全文。确保包含 (46)-(50) 等题号，以便 AI 获取更精准的上下文语义...',
      bulkEntry: '批量数据输入',
      standardKeys: '标准答案 (批量)',
      yourVersion: '你的译文 (批量)',
      placeholderStandard: '(46) 标准答案参考...',
      placeholderUser: '(46) 你的翻译版本...',
      systemGuide: '使用指南',
      guide1: 'AI 解析全文以获取精确的语义背景。',
      guide2: '输入标准答案和你的译文块。',
      guide3: '神经网络系统将在 10 分制下进行深度诊断。',
      sessionLabel: '试卷标识/年份',
      placeholderSession: '例如：2024 英语一 真题',
      startDiagnosis: '开启智能诊断',
      syncToCloud: '同步至云端',
      officialCriteria: '官方评分维度',
      accuracy: '准确性',
      completeness: '完整性',
      fluency: '通顺度',
      neuralAssessment: '神经网络评估',
      diagnosticKey: '诊断图示说明',
      sample: '示例',
      errorFocus: '错误/建议提示',
      missingUnits: '关键漏译内容',
      scoringPoint: '核心采分点',
      refinement: '表达精进方向',
      visualDiagnostics: '可视化诊断报告',
      mappingAnalyzer: '句法解析与语义映射',
      originalSentence: '英文原句',
      userVersion: '用户译文版本',
      missingSemantic: '🔵 漏译缺失意群:',
      officialKey: '标准答案参考',
      gradingDeepDive: '核心采分点拆解',
      neuralLinguistic: '深度语言学诊断',
      semanticAnalysis: '语义与逻辑差异分析',
      structureMapping: '逻辑结构映射',
      strategicUpgrades: '💡 针对性精进建议',
      knowledgeRepository: '📚 核心知识点复盘',
      point: '得分点',
      rationale: '解析',
      capturedInput: '你的表达',
      expectedTarget: '标准期待',
      copyOrig: '复制原句',
      copyUser: '复制译文',
      copyStd: '复制标答',
      learningFeedback: '深度学习统计反馈',
      evaluatedUnits: '已评估题数',
      coverage: '100% 覆盖',
      painPoints: '待优化疑难点',
      requiresFocus: '需重点突破',
      criticalAreas: '核心提分精进方向',
      startNew: '开启新试卷诊断',
      deletePerm: '彻底删除此记录',
      confirmDelete: '确认彻底删除？',
      logicCore: '诊断逻辑核心',
      logicDesc: 'Part C 语言学与语法体系。10分评分制。采用神经网络纠错技术 (NEC) v2.4。',
      poweredBy: 'Antigravity 引擎强力驱动',
      engineDesc: '上下文感知评估引擎。为卓越学术表现而设计。',
      openReport: '查看详细报告',
      refresh: '刷新记录'
    },
    en: {
      appName: 'SoftFlow',
      appSuffix: 'Pro',
      appDesc: 'Part C Neural Assessor',
      signIn: 'SIGN IN',
      signOut: 'SIGN OUT',
      input: 'INPUT',
      report: 'REPORT',
      historyTitle: 'Historical Records',
      backToApp: 'BACK TO APP',
      activeSession: 'ACTIVE SESSION',
      noHistory: 'No synchronized records found',
      fullArticle: 'FULL CONTEXT ARTICLE',
      tagsRequired: 'TAGS (46)-(50) REQUIRED',
      placeholderArticle: 'Paste the full Part C English text here. Ensure題号 (46)-(50) are present for context awareness...',
      bulkEntry: 'Bulk Data Entry',
      standardKeys: 'Standard Keys',
      yourVersion: 'Your Version',
      placeholderStandard: '(46) Standard answer here...',
      placeholderUser: '(46) Your translation here...',
      systemGuide: 'System Guide',
      guide1: 'AI parses the full article for semantic grounding.',
      guide2: 'Input standard key and your translated text blocks.',
      guide3: 'Neural analysis evaluates 10-point scale diagnostic.',
      sessionLabel: 'Session Identifier',
      placeholderSession: 'e.g. 2024 Exam Set A',
      startDiagnosis: 'START DIAGNOSIS',
      syncToCloud: 'SYNC TO CLOUD',
      officialCriteria: 'Official Criteria',
      accuracy: 'Accuracy',
      completeness: 'Completeness',
      fluency: 'Fluency',
      neuralAssessment: 'NEURAL ASSESSMENT',
      diagnosticKey: 'DIAGNOSTIC KEY',
      sample: 'SAMPLE',
      errorFocus: 'ERROR FOCUS',
      missingUnits: 'MISSING UNITS',
      scoringPoint: 'SCORING POINT',
      refinement: 'REFINEMENT',
      visualDiagnostics: 'Visual Diagnostics',
      mappingAnalyzer: 'SENTENCE MAPPING ANALYZER',
      originalSentence: 'Original Sentence',
      userVersion: 'USER VERSION',
      missingSemantic: '🔵 MISSING SEMANTIC UNITS:',
      officialKey: 'OFFICIAL KEY',
      gradingDeepDive: 'Grading Points Deep-Dive',
      neuralLinguistic: 'Neural Linguistic Diagnosis',
      semanticAnalysis: 'SEMANTIC ANALYSIS',
      structureMapping: 'STRUCTURE MAPPING',
      strategicUpgrades: 'STRATEGIC UPGRADES',
      knowledgeRepository: 'KNOWLEDGE REPOSITORY',
      point: 'POINT',
      rationale: 'Rationale',
      capturedInput: 'CAPTURED INPUT',
      expectedTarget: 'EXPECTED TARGET',
      copyOrig: 'Copy Original',
      copyUser: 'Copy My Version',
      copyStd: 'Copy Standard',
      learningFeedback: 'NEURAL LEARNING FEEDBACK',
      evaluatedUnits: 'EVALUATED UNITS',
      coverage: '100% COVERAGE',
      painPoints: 'PAIN POINTS',
      requiresFocus: 'REQUIRES FOCUS',
      criticalAreas: 'CRITICAL REFINEMENT AREAS',
      startNew: 'START NEW SESSION',
      deletePerm: 'DELETE PERMANENTLY',
      confirmDelete: 'CONFIRM PERMANENT DELETE?',
      logicCore: 'Logic Core',
      logicDesc: 'Part C Philology & Syntax. 10 Pts Scale. Neural Error Correction (NEC) v2.4.',
      poweredBy: 'Powered by Antigravity',
      engineDesc: 'Context-aware Assessment Engine. Built for academic excellence.',
      openReport: 'OPEN REPORT',
      refresh: 'Refresh history'
    }
  };

  const cur = t[language];
  
  const [user, setUser] = useState<User | null>(null);
  const [recordTitle, setRecordTitle] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [currentRecordId, setCurrentRecordId] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleSection = (id: string, section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [`${id}-${section}`]: !prev[`${id}-${section}`]
    }));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const renderTranslationWithMarks = (parts: TranslationSegment[]) => {
    return (
      <div className="flex flex-wrap items-baseline gap-y-2">
        {parts.map((part, idx) => {
          if (part.type === 'correct') {
            return <span key={idx} className="text-slate-800 mr-1">{part.text}</span>;
          } else if (part.type === 'error') {
            return (
              <span key={idx} className="relative inline-flex flex-col mx-1">
                <span className="bg-red-100 text-red-900 px-1 rounded font-medium border-b-2 border-red-300">{part.text}</span>
                {part.feedback && (
                  <span className="text-[10px] text-red-500 font-bold mt-0.5 leading-none">❌ {part.feedback}</span>
                )}
              </span>
            );
          } else if (part.type === 'scoring') {
            return (
              <span key={idx} className="bg-emerald-50 text-emerald-900 px-1.5 py-0.5 rounded-md border border-emerald-100 font-medium mx-1 flex items-center gap-1 group relative">
                {part.text}
                <span className="text-[8px] font-black bg-emerald-200 text-emerald-700 px-1 rounded uppercase tracking-tighter">{part.label || 'POINT'}</span>
              </span>
            );
          } else {
            return <span key={idx} className="text-slate-600 mr-1">{part.text}</span>;
          }
        })}
      </div>
    );
  };

  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        // Ignored, just for checking connection
      }
    };
    testConnection();

    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchHistory(currentUser.uid);
      }
    });
  }, []);

  const fetchHistory = async (uid: string) => {
    console.log('--- Fetching History ---');
    console.log('UID:', uid);
    try {
      const q = query(
        collection(db, 'records'), 
        where('userId', '==', uid)
      );
      const querySnapshot = await getDocs(q);
      console.log('Snapshot Size:', querySnapshot.size);
      
      const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Sort client-side by updatedAt or createdAt
      docs.sort((a: any, b: any) => {
        const timeA = (a.updatedAt?.toMillis?.() || a.createdAt?.toMillis?.() || a.updatedAt || a.createdAt || 0);
        const timeB = (b.updatedAt?.toMillis?.() || b.createdAt?.toMillis?.() || b.updatedAt || b.createdAt || 0);
        return timeB - timeA;
      });
      
      setHistory(docs);
      setError(null);
    } catch (err: any) {
      console.error('FETCH ERROR:', err);
      setError('云端同步失败: ' + err.message);
    }
  };

  const login = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      console.log('Login success:', result.user.uid);
    } catch (err: any) {
      console.error('Login error:', err);
      setError('登录失败: ' + err.message);
    }
  };

  const logout = () => signOut(auth);

  const deleteRecord = async (id: string | null) => {
    if (!id) return;
    
    // Custom two-step confirmation
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      // Auto-cancel confirmation after 4 seconds
      setTimeout(() => setConfirmDeleteId(null), 4000);
      return;
    }
    
    console.log('Confirmed deletion for record:', id);
    setDeleteLoading(id);
    setConfirmDeleteId(null);
    try {
      await deleteDoc(doc(db, 'records', id));
      console.log('Delete success');
      if (user) await fetchHistory(user.uid);
      if (currentRecordId === id) {
        setCurrentRecordId(null);
        resetForm();
      }
    } catch (err: any) {
      console.error('DELETE ERROR:', err);
      setError('删除失败: ' + err.message);
    } finally {
      setDeleteLoading(null);
    }
  };

  // Helper to parse bulk text into a map of {id: content}
  const parseBulkText = (text: string) => {
    const pattern = /(?:\(|\b)(4[6-9]|50)(?:\)|\.|、|\s)+/g;
    const parts = text.split(pattern);
    const results: Record<string, string> = {};
    
    // Result of split with capturing group: [unmatched, "46", "content", "47", "content", ...]
    for (let i = 1; i < parts.length; i += 2) {
      const id = `(${parts[i]})`;
      const content = parts[i+1]?.trim() || '';
      results[id] = content;
    }
    return results;
  };

  const handleGrade = async () => {
    if (!fullArticle || !userAnswersBulk || !standardAnswersBulk) {
      setError('请填入全文、批量标准答案以及你的批量译文。');
      return;
    }

    const userMap = parseBulkText(userAnswersBulk);
    const standardMap = parseBulkText(standardAnswersBulk);
    
    // Validate we have 5 items
    const requiredIds = ['(46)', '(47)', '(48)', '(49)', '(50)'];
    const parsedItems: QuestionInput[] = requiredIds.map(id => ({
      id,
      userAnswer: userMap[id] || '',
      standardAnswer: standardMap[id] || ''
    }));

    if (parsedItems.some(item => !item.userAnswer || !item.standardAnswer)) {
      setError('解析失败：请确保回答中包含清晰的题号标记 (46-50)。');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullArticle, items: parsedItems }),
      });

      if (!response.ok) {
        throw new Error('服务响应异常，请稍后再试。');
      }

      const data = await response.json();
      setResult(data);
      setActiveTab('result');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveRecord = async () => {
    if (!user) {
      setError('请先登录以保存记录。');
      return;
    }
    if (!recordTitle) {
      setError('请输入试卷名称或年份作为保存标题。');
      return;
    }
    if (!result) return;

    const userMap = parseBulkText(userAnswersBulk);
    const standardMap = parseBulkText(standardAnswersBulk);
    const parsedItems: QuestionInput[] = ['(46)', '(47)', '(48)', '(49)', '(50)'].map(id => ({
      id,
      userAnswer: userMap[id] || '',
      standardAnswer: standardMap[id] || ''
    }));

    setSaveLoading(true);
    console.log('Attempting to save record...', { id: currentRecordId, title: recordTitle });
    
    try {
      const recordData = {
        title: recordTitle,
        fullArticle,
        items: parsedItems,
        userAnswersBulk,
        standardAnswersBulk,
        result: JSON.parse(JSON.stringify(result)), // Deep copy to ensure clean object
        userId: user.uid,
        updatedAt: serverTimestamp(),
        createdAt: currentRecordId ? history.find(h => h.id === currentRecordId)?.createdAt : serverTimestamp(),
      };

      if (currentRecordId) {
        // Update existing
        await setDoc(doc(db, 'records', currentRecordId), recordData, { merge: true });
        console.log('Record updated:', currentRecordId);
      } else {
        // Create new
        const docRef = await addDoc(collection(db, 'records'), recordData);
        setCurrentRecordId(docRef.id);
        console.log('New record created:', docRef.id);
      }
      
      await fetchHistory(user.uid);
      alert('✅ 诊断记录已成功同步到云端！');
    } catch (err: any) {
      console.error('CRITICAL SAVE ERROR:', err);
      setError('同步云端失败: ' + err.message + ' (请截屏控制台报错联系支持)');
    } finally {
      setSaveLoading(false);
    }
  };

  const loadRecord = (record: any) => {
    try {
      setFullArticle(record.fullArticle || '');
      
      // Reconstruct bulk texts for user view, prefer saved bulk version if exists
      const uBulk = record.userAnswersBulk || record.items?.map((it: any) => `${it.id} ${it.userAnswer}`).join('\n') || '';
      const sBulk = record.standardAnswersBulk || record.items?.map((it: any) => `${it.id} ${it.standardAnswer}`).join('\n') || '';
      
      setUserAnswersBulk(uBulk);
      setStandardAnswersBulk(sBulk);
      
      setResult(record.result || null);
      setRecordTitle(record.title || '');
      setCurrentRecordId(record.id);
      setShowHistory(false);
      setActiveTab('result');
    } catch (err) {
      console.error('Error loading record:', err);
      setError('记录加载失败，数据格式可能已损坏。');
    }
  };

  const resetForm = () => {
    setResult(null);
    setError(null);
    setUserAnswersBulk('');
    setRecordTitle('');
    setCurrentRecordId(null);
    setActiveTab('input');
  };

  return (
    <div className="min-h-screen font-sans selection:bg-blue-100 bg-neu-bg">
      <header className="py-8 px-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 rounded-2xl neu-in flex items-center justify-center">
               <Layers className="w-6 h-6 text-blue-600" />
             </div>
             <div>
              <h1 className="text-3xl font-display font-black tracking-tight text-gray-800">
                SoftFlow<span className="text-blue-600">Pro</span>
              </h1>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Part C Neural Assessor</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Language Toggle */}
            <button 
              onClick={() => setLanguage(l => l === 'zh' ? 'en' : 'zh')}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl neu-out bg-neu-bg text-[10px] font-black text-gray-700 hover:neu-subtle active:neu-in transition-all"
            >
              {language === 'zh' ? 'ENGLISH' : '中文'}
            </button>

            {user ? (
              <div className="flex items-center gap-3 px-4 py-2 rounded-2xl neu-out bg-neu-bg">
                <div className="flex flex-col items-end">
                  <span className="text-[8px] font-black text-gray-400">{cur.activeSession}</span>
                  <span className="text-xs font-black text-gray-700">{user.email?.split('@')[0]}</span>
                </div>
                <button 
                  onClick={logout} 
                  className="w-10 h-10 rounded-xl neu-subtle flex items-center justify-center text-gray-400 hover:text-red-500 transition-all active:neu-in"
                  title={cur.signOut}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button 
                onClick={login} 
                className="flex items-center gap-2 px-6 py-3 rounded-2xl neu-out bg-neu-bg text-xs font-black text-gray-700 hover:neu-subtle active:neu-in transition-all"
              >
                <LogIn className="w-4 h-4 text-blue-600" />
                {cur.signIn}
              </button>
            )}

            <div className="flex items-center gap-2 p-2 rounded-2xl neu-in bg-neu-bg">
              <button 
                onClick={() => { setActiveTab('input'); setShowHistory(false); }}
                className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'input' && !showHistory ? 'bg-blue-600 text-white shadow-lg active:neu-in' : 'text-gray-400 hover:text-gray-600'}`}
              >
                {cur.input}
              </button>
              <button 
                onClick={() => { setActiveTab('result'); setShowHistory(false); }}
                disabled={!result}
                className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'result' && !showHistory ? 'bg-blue-600 text-white shadow-lg active:neu-in' : 'text-gray-400 hover:text-gray-600 disabled:opacity-20'}`}
              >
                {cur.report}
              </button>
              {user && (
                <button 
                  onClick={() => setShowHistory(true)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black transition-all ${showHistory ? 'bg-indigo-600 text-white shadow-lg active:neu-in' : 'text-gray-400 hover:text-gray-600 neu-subtle'}`}
                >
                  <History className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pb-20">
        <AnimatePresence mode="wait">
          {showHistory ? (
            <motion.div
              key="history-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h2 className="text-2xl font-display font-black text-gray-800">{cur.historyTitle}</h2>
                  <button 
                    onClick={() => user && fetchHistory(user.uid)}
                    className="w-10 h-10 rounded-xl neu-subtle flex items-center justify-center text-gray-400 hover:text-blue-600 transition-all active:neu-in"
                    title={cur.refresh}
                  >
                    <RefreshCcw className="w-4 h-4" />
                  </button>
                </div>
                <button 
                  onClick={() => setShowHistory(false)} 
                  className="px-6 py-2 rounded-xl neu-out text-xs font-black text-blue-600 hover:neu-subtle active:neu-in transition-all"
                >
                  {cur.backToApp}
                </button>
              </div>
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-8">
                {history.length > 0 ? history.map((record) => (
                  <div key={record.id} className="p-8 rounded-[2.5rem] neu-out bg-neu-bg flex flex-col justify-between group h-full">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{record.createdAt ? new Date(record.createdAt?.toDate()).toLocaleDateString() : 'Just now'}</span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); deleteRecord(record.id); }} 
                          disabled={!!deleteLoading}
                          className={`w-10 h-10 rounded-xl transition-all flex items-center justify-center ${confirmDeleteId === record.id ? 'bg-red-500 text-white shadow-lg animate-pulse' : 'neu-subtle text-gray-400 hover:text-red-500'}`}
                          title={confirmDeleteId === record.id ? cur.confirmDelete : cur.deletePerm}
                        >
                          {deleteLoading === record.id ? (
                            <RefreshCcw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-gray-800 line-clamp-2 leading-tight mb-4">{record.title || 'Untitled Session'}</h3>
                        <div className="flex items-end gap-2 p-4 rounded-2xl neu-in bg-neu-bg w-fit">
                          <span className="text-3xl font-black text-blue-600 leading-none">{record.result?.totalScore?.toFixed(1) || '0.0'}</span>
                          <span className="text-xs font-black text-gray-300 mb-1">/ 10.0</span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => loadRecord(record)}
                      className="mt-8 w-full py-4 rounded-2xl neu-subtle bg-neu-bg text-gray-600 font-black text-xs hover:neu-out active:neu-in transition-all flex items-center justify-center gap-3"
                    >
                      <FileText className="w-4 h-4 text-blue-500" /> {cur.openReport}
                    </button>
                  </div>
                )) : (
                  <div className="col-span-full py-32 rounded-[3rem] neu-in bg-neu-bg text-center space-y-4">
                    <History className="w-16 h-16 text-gray-200 mx-auto" />
                    <p className="text-gray-400 font-black uppercase tracking-widest text-sm">{cur.noHistory}</p>
                  </div>
                )}
              </div>
            </motion.div>
          ) : activeTab === 'input' ? (
            <motion.div
              key="input-section"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid lg:grid-cols-12 gap-8"
            >
              {/* Main Inputs */}
              <div className="lg:col-span-12 xl:col-span-8 space-y-10">
                <div className="p-10 rounded-[3rem] neu-out bg-neu-bg space-y-8">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-500" /> {cur.fullArticle}
                      </label>
                      <span className="text-[10px] font-black text-blue-500 bg-white/50 px-3 py-1 rounded-full neu-out">{cur.tagsRequired}</span>
                    </div>
                    <div className="rounded-[2.5rem] neu-in bg-neu-bg p-2">
                      <textarea
                        value={fullArticle}
                        onChange={(e) => setFullArticle(e.target.value)}
                        placeholder={cur.placeholderArticle}
                        className="w-full min-h-[300px] p-6 bg-transparent outline-none text-gray-700 placeholder:text-gray-400 leading-relaxed resize-none font-medium text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-3 px-2">
                      <div className="w-8 h-8 rounded-xl neu-subtle flex items-center justify-center">
                        <Send className="w-4 h-4 text-indigo-500" />
                      </div>
                      <h2 className="text-sm font-black uppercase tracking-[0.2em] text-gray-800">{cur.bulkEntry}</h2>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4">{cur.standardKeys}</label>
                        <div className="rounded-3xl neu-in bg-neu-bg p-2 h-full">
                           <textarea
                            value={standardAnswersBulk}
                            onChange={(e) => setStandardAnswersBulk(e.target.value)}
                            placeholder={cur.placeholderStandard}
                            className="w-full min-h-[220px] p-4 bg-transparent outline-none text-sm text-gray-600 placeholder:text-gray-300 resize-none font-medium leading-relaxed"
                          />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4">{cur.yourVersion}</label>
                        <div className="rounded-3xl neu-in bg-neu-bg p-2 h-full">
                          <textarea
                            value={userAnswersBulk}
                            onChange={(e) => setUserAnswersBulk(e.target.value)}
                            placeholder={cur.placeholderUser}
                            className="w-full min-h-[220px] p-4 bg-transparent outline-none text-sm text-gray-600 placeholder:text-gray-300 resize-none font-medium leading-relaxed"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sidebar Info */}
              <div className="lg:col-span-12 xl:col-span-4 space-y-8">
                <div className="p-8 rounded-[3rem] neu-out bg-neu-bg space-y-8">
                  <div>
                    <h3 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg">
                        <Zap className="w-5 h-5" />
                      </div>
                      {cur.systemGuide}
                    </h3>
                    <div className="space-y-4">
                      {[
                        { step: '01', text: cur.guide1 },
                        { step: '02', text: cur.guide2 },
                        { step: '03', text: cur.guide3 }
                      ].map((item) => (
                        <div key={item.step} className="flex gap-4 p-4 rounded-2xl neu-subtle group hover:neu-out transition-all">
                          <span className="text-sm font-black text-blue-500">{item.step}</span>
                          <p className="text-[11px] font-bold text-gray-500 leading-relaxed">{item.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-6 pt-6 border-t border-gray-300/30">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">{cur.sessionLabel}</label>
                      <div className="p-1 rounded-2xl neu-in bg-neu-bg">
                        <input 
                          type="text"
                          value={recordTitle}
                          onChange={(e) => setRecordTitle(e.target.value)}
                          placeholder={cur.placeholderSession}
                          className="w-full bg-transparent p-4 text-xs font-black text-gray-700 outline-none placeholder:text-gray-300"
                        />
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-4">
                      <button
                        onClick={handleGrade}
                        disabled={loading}
                        className={`w-full py-5 rounded-[2rem] font-black text-sm transition-all transform active:neu-in flex items-center justify-center gap-3 ${loading ? 'neu-in text-gray-400' : 'bg-blue-600 text-white neu-out hover:opacity-90'}`}
                      >
                        {loading ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <><Zap className="w-4 h-4" /> {cur.startDiagnosis}</>}
                      </button>
                      
                      {result && user && (
                        <button
                          onClick={saveRecord}
                          disabled={saveLoading}
                          className={`w-full py-5 rounded-[2rem] font-black text-sm transition-all transform active:neu-in flex items-center justify-center gap-3 ${saveLoading ? 'neu-in text-gray-400' : 'neu-out bg-neu-bg text-gray-600 hover:text-blue-600'}`}
                        >
                          {saveLoading ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> {cur.syncToCloud}</>}
                        </button>
                      )}
                    </div>

                    {error && (
                      <div className="p-4 rounded-2xl bg-white/50 neu-out flex items-center gap-3 border-l-4 border-l-red-500">
                        <AlertCircle className="w-5 h-5 text-red-500" />
                        <p className="text-[10px] font-black text-red-600 leading-tight">{error}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-8 rounded-[3.5rem] neu-in bg-neu-bg space-y-6">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-blue-500" /> {cur.officialCriteria}
                  </h4>
                  <div className="grid grid-cols-1 gap-4">
                    {[
                      { label: cur.accuracy, color: 'blue' },
                      { label: cur.completeness, color: 'indigo' },
                      { label: cur.fluency, color: 'emerald' }
                    ].map(rule => (
                      <div key={rule.label} className="p-4 rounded-2xl neu-subtle bg-neu-bg">
                        <div className="text-xs font-black text-gray-800">{rule.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="result-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Total Score Hero */}
              <div className="p-12 rounded-[3.5rem] neu-out bg-neu-bg flex flex-col md:flex-row items-center justify-between gap-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px]" />
                <div className="space-y-6 text-center md:text-left relative z-10">
                  <div className="flex items-center justify-center md:justify-start gap-4">
                    <div className="w-12 h-12 rounded-2xl neu-out bg-white/20 flex items-center justify-center">
                      <Award className="w-7 h-7 text-yellow-500" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-[0.4em] text-gray-400">{cur.neuralAssessment}</span>
                  </div>
                  <div className="flex items-end gap-3 justify-center md:justify-start">
                    <span className="text-9xl font-display font-black text-gray-800 leading-none">{result?.totalScore.toFixed(1)}</span>
                    <span className="text-3xl font-black text-gray-300 mb-2">/ 10.0</span>
                  </div>
                  <p className="text-gray-500 font-bold max-w-md italic leading-relaxed text-sm p-4 rounded-2xl neu-in bg-white/10">
                    “{result?.overallSummary}”
                  </p>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-6 relative z-10">
                  {result?.details.map((d, i) => (
                    <div key={i} className="flex flex-col items-center gap-3">
                      <div className={`w-16 h-24 rounded-[1.5rem] flex flex-col items-center justify-center font-black transition-all ${d.score >= 1.5 ? 'bg-emerald-600 text-white shadow-[6px_6px_12px_#b8bcc2,-6px_-6px_12px_#ffffff]' : d.score >= 1.0 ? 'bg-blue-600 text-white shadow-[6px_6px_12px_#b8bcc2,-6px_-6px_12px_#ffffff]' : 'neu-in text-gray-400'}`}>
                        <span className="text-[10px] opacity-60 mb-2 font-black">{d.id}</span>
                        <span className="text-2xl">{d.score.toFixed(1)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Markers Explanation */}
              <div className="p-8 rounded-[2.5rem] neu-in bg-neu-bg">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 px-2 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-500" /> {cur.diagnosticKey}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                  {[
                    { bg: 'bg-red-100', text: 'text-red-600', label: cur.errorFocus, sign: '❌' },
                    { bg: 'bg-indigo-100', text: 'text-indigo-600', label: cur.missingUnits, sign: '🔵' },
                    { bg: 'bg-emerald-100', text: 'text-emerald-700', label: cur.scoringPoint, sign: '✅' },
                    { bg: 'bg-blue-100', text: 'text-blue-700', label: cur.refinement, sign: '📝' }
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-2xl neu-subtle bg-neu-bg">
                      <span className={`px-2 py-1 ${item.bg} ${item.text} text-[10px] font-black rounded-lg shrink-0`}>{cur.sample}</span>
                      <span className="text-[10px] font-black text-gray-500">{item.sign} {item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Individual Question Details */}
              <div className="space-y-12">
                {result?.details.map((detail, idx) => (
                  <motion.div 
                    key={detail.id}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col"
                  >
                    {/* Card Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-[1.5rem] neu-out bg-blue-600 flex items-center justify-center text-3xl font-black text-white shadow-xl shadow-blue-500/20">
                          {detail.id.replace('(', '').replace(')', '')}
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-gray-800">{cur.visualDiagnostics}</h3>
                          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">{cur.mappingAnalyzer}</div>
                        </div>
                      </div>
                      <div className="flex items-end gap-3 p-4 rounded-3xl neu-in bg-neu-bg w-fit self-end md:self-auto">
                        <div className="text-3xl font-black text-blue-600 leading-none">{detail.score.toFixed(1)}</div>
                        <div className="text-[10px] font-black text-gray-300 mb-1 uppercase">/ 2.0 {cur.point}S</div>
                      </div>
                    </div>

                    <div className="h-1 rounded-full neu-in bg-neu-bg overflow-hidden mx-2">
                      <motion.div 
                        className="h-full bg-blue-600 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${(detail.score / 2.0) * 100}%` }}
                        transition={{ delay: 0.5 + idx * 0.1, duration: 1 }}
                      />
                    </div>

                    <div className="p-8 space-y-12">
                      {/* Original Sentence */}
                      <section className="space-y-4">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] px-4">{cur.originalSentence}</h4>
                        <div className="p-8 rounded-[2rem] neu-in bg-neu-bg text-gray-700 leading-relaxed font-bold text-sm">
                          {detail.originalSentence}
                        </div>
                      </section>

                      {/* Comparison Area */}
                      <section className="grid lg:grid-cols-2 gap-10">
                        {/* Your Translation */}
                        <div className="space-y-4">
                          <h4 className="text-[10px] font-black text-red-400 uppercase tracking-[0.3em] px-4 flex items-center gap-2">
                            <Send className="w-3 h-3" /> {cur.userVersion}
                          </h4>
                          <div className="neu-in bg-neu-bg p-8 rounded-[2.5rem] min-h-[160px] space-y-6">
                            <div className="leading-loose">
                              {renderTranslationWithMarks(detail.yourTranslation)}
                            </div>
                            
                            {detail.missingParts && detail.missingParts.length > 0 && (
                              <div className="pt-6 border-t border-gray-300/30">
                                <div className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-4">{cur.missingSemantic}</div>
                                <ul className="flex flex-wrap gap-2">
                                  {detail.missingParts.map((part, i) => (
                                    <li key={i} className="text-[10px] font-black text-red-800 bg-red-100 px-4 py-2 rounded-xl">
                                      {part}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Standard Answer */}
                        <div className="space-y-4">
                          <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] px-4 flex items-center gap-2">
                            <CheckCircle2 className="w-3 h-3" /> {cur.officialKey}
                          </h4>
                          <div className="neu-in bg-neu-bg p-8 rounded-[2.5rem] min-h-[160px]">
                            <div className="leading-loose">
                              {renderTranslationWithMarks(detail.standardAnswer)}
                            </div>
                          </div>
                        </div>
                      </section>

                      {/* Expandable Analysis Sections */}
                      <div className="space-y-6">
                        {/* Scoring Points Analysis */}
                        <div className="rounded-[2.5rem] overflow-hidden neu-subtle bg-neu-bg">
                          <button
                            onClick={() => toggleSection(detail.id, 'points')}
                            className="w-full flex items-center justify-between p-6 hover:neu-out transition-all"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl neu-in flex items-center justify-center text-amber-500">
                                <Award className="w-5 h-5" />
                              </div>
                              <span className="text-xs font-black text-gray-800 uppercase tracking-widest">{cur.gradingDeepDive}</span>
                            </div>
                            {expandedSections[`${detail.id}-points`] ? <ChevronUp className="w-5 h-5 text-gray-300" /> : <ChevronDown className="w-5 h-5 text-gray-300" />}
                          </button>
                          
                          <AnimatePresence>
                            {expandedSections[`${detail.id}-points`] && (
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: 'auto' }}
                                exit={{ height: 0 }}
                                className="overflow-hidden bg-white/20 backdrop-blur-sm"
                              >
                                <div className="p-8 space-y-6">
                                  {detail.scoringPoints.map((point, pIdx) => (
                                    <div key={pIdx} className="p-6 rounded-3xl neu-in bg-neu-bg space-y-6">
                                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                          <span className="text-[9px] font-black text-amber-600 bg-amber-100 px-3 py-1 rounded-full">{cur.point} {pIdx + 1}</span>
                                          <span className="text-sm font-black text-gray-800">{point.point}</span>
                                        </div>
                                        <div className="font-black text-xs p-2 rounded-xl neu-out bg-neu-bg w-fit">
                                          <span className={point.score > 0 ? 'text-emerald-600' : 'text-red-500'}>{point.score.toFixed(1)}</span>
                                          <span className="text-gray-300 mx-1">/</span>
                                          <span className="text-gray-400">{point.maxScore.toFixed(1)}</span>
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-[11px] font-bold">
                                        <div className="space-y-2">
                                          <div className="text-[9px] font-black text-red-400 uppercase tracking-widest">{cur.capturedInput}</div>
                                          <div className="text-gray-500 leading-relaxed italic">{point.yourVersion || 'No match found'}</div>
                                        </div>
                                        <div className="space-y-2">
                                          <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">{cur.expectedTarget}</div>
                                          <div className="text-gray-800 leading-relaxed">{point.standard}</div>
                                        </div>
                                      </div>
                                      <div className="p-4 rounded-xl neu-subtle bg-white/30 text-[10px] font-bold text-gray-500 flex gap-3">
                                        <span className="text-amber-600 uppercase font-black">{cur.rationale}:</span>
                                        {point.reason}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Deep Diagnosis */}
                        <div className="rounded-[2.5rem] overflow-hidden neu-subtle bg-neu-bg">
                          <button
                            onClick={() => toggleSection(detail.id, 'diagnosis')}
                            className="w-full flex items-center justify-between p-6 hover:neu-out transition-all"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl neu-in flex items-center justify-center text-indigo-500">
                                <Lightbulb className="w-5 h-5" />
                              </div>
                              <span className="text-xs font-black text-gray-800 uppercase tracking-widest">{cur.neuralLinguistic}</span>
                            </div>
                            {expandedSections[`${detail.id}-diagnosis`] ? <ChevronUp className="w-5 h-5 text-gray-300" /> : <ChevronDown className="w-5 h-5 text-gray-300" />}
                          </button>
                          
                          <AnimatePresence>
                            {expandedSections[`${detail.id}-diagnosis`] && (
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: 'auto' }}
                                exit={{ height: 0 }}
                                className="overflow-hidden bg-white/20 backdrop-blur-sm"
                              >
                                <div className="p-10 space-y-12">
                                  {/* Semantic Difference */}
                                  <div className="space-y-4">
                                    <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4">{cur.semanticAnalysis}</h5>
                                    <p className="text-xs font-bold text-gray-700 leading-loose neu-in bg-neu-bg p-8 rounded-3xl">
                                      {detail.diagnosis.semanticDifference}
                                    </p>
                                  </div>

                                  {/* Logical Breakdown */}
                                  <div className="space-y-6">
                                    <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4">{cur.structureMapping}</h5>
                                    <div className="space-y-3">
                                      {detail.diagnosis.logicalBreakdown.map((logic, lIdx) => (
                                        <div key={lIdx} className="flex gap-6 p-5 rounded-2xl neu-subtle bg-neu-bg items-start group">
                                          <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-black text-[10px] ${lIdx === 0 ? 'bg-gray-800 text-white' : lIdx === 1 ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'}`}>
                                            {lIdx === 0 ? 'ORIG' : lIdx === 1 ? 'TRANS' : 'DIFF'}
                                          </div>
                                          <p className="text-xs text-gray-600 font-bold pt-2.5 leading-relaxed">{logic}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Improvements & Knowledge Review */}
                                  <div className="grid md:grid-cols-2 gap-12 pt-6">
                                    <div className="space-y-6">
                                      <h5 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest px-2">{cur.strategicUpgrades}</h5>
                                      <ul className="space-y-4">
                                        {detail.diagnosis.improvements.map((imp, iIdx) => (
                                          <li key={iIdx} className="text-xs font-black text-gray-700 flex gap-4">
                                            <span className="shrink-0 w-6 h-6 rounded-lg neu-out bg-white text-blue-600 flex items-center justify-center text-[10px]">{iIdx + 1}</span>
                                            <span className="pt-1 leading-relaxed">{imp}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                    <div className="space-y-6">
                                      <h5 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest px-2">{cur.knowledgeRepository}</h5>
                                      <div className="grid grid-cols-1 gap-3">
                                        {detail.diagnosis.knowledgeReview.map((kr, kIdx) => (
                                          <div key={kIdx} className="p-5 rounded-2xl neu-in bg-neu-bg border-l-4 border-l-emerald-400">
                                            <div className="text-xs font-black text-gray-800 mb-1">{kr.term}</div>
                                            <div className="text-[10px] text-gray-400 font-bold italic">{kr.meanings.join(' | ')}</div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                      {/* Copy Actions */}
                      <div className="flex flex-wrap gap-2 pt-6 border-t border-slate-100">
                        <button
                          onClick={() => copyToClipboard(detail.originalSentence, `${detail.id}-orig`)}
                          className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-600 transition-all active:scale-95 border border-slate-100"
                        >
                          {copiedId === `${detail.id}-orig` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          {cur.copyOrig}
                        </button>
                        <button
                          onClick={() => copyToClipboard(detail.yourTranslation.map(p => p.text).join(''), `${detail.id}-user`)}
                          className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase bg-red-50 hover:bg-red-100 rounded-xl text-red-600 transition-all active:scale-95 border border-red-100"
                        >
                          {copiedId === `${detail.id}-user` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          {cur.copyUser}
                        </button>
                        <button
                          onClick={() => copyToClipboard(detail.standardAnswer.map(p => p.text).join(''), `${detail.id}-std`)}
                          className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase bg-emerald-50 hover:bg-emerald-100 rounded-xl text-emerald-600 transition-all active:scale-95 border border-emerald-100"
                        >
                          {copiedId === `${detail.id}-std` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          {cur.copyStd}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Bottom Statistics */}
              <div className="p-12 rounded-[3.5rem] neu-out bg-neu-bg relative overflow-hidden group">
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/5 rounded-full blur-[100px] group-hover:scale-110 transition-transform duration-1000" />
                <h3 className="text-xl font-display font-black mb-10 flex items-center gap-4 relative z-10 text-gray-800">
                  <div className="w-12 h-12 rounded-2xl neu-in bg-white/20 flex items-center justify-center text-blue-600">
                    <BarChart2 className="w-6 h-6" />
                  </div>
                  {cur.learningFeedback}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 relative z-10 text-center md:text-left">
                  <div className="space-y-3">
                    <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{cur.evaluatedUnits}</div>
                    <div className="text-5xl font-display font-black text-gray-800">{result?.details.length}</div>
                    <div className="text-[10px] font-black text-gray-400">{cur.coverage}</div>
                  </div>
                  <div className="space-y-3">
                    <div className="text-[10px] font-black text-red-500 uppercase tracking-widest">{cur.painPoints}</div>
                    <div className="text-5xl font-display font-black text-gray-800">{result?.details.filter(d => d.score < 1.5).length}</div>
                    <div className="text-[10px] font-black text-gray-400">{cur.requiresFocus}</div>
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <div className="p-8 rounded-[2.5rem] neu-in bg-neu-bg h-full flex flex-col justify-center">
                      <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-4">{cur.criticalAreas}</div>
                      <div className="space-y-3">
                        {result?.details.slice(0, 2).map((d, i) => (
                          <div key={i} className="flex items-center gap-4 text-[11px] text-gray-600 font-bold group/item">
                            <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 group-hover/item:neu-out transition-all">
                              <ArrowRight className="w-3.5 h-3.5" />
                            </div>
                            <span className="line-clamp-1">{d.diagnosis.improvements[0] || (language === 'zh' ? '保持当前状态' : 'Keep consistency')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-16 flex flex-col sm:flex-row items-center justify-center gap-6">
                <button
                  onClick={resetForm}
                  className="px-12 py-5 rounded-[2.5rem] neu-out bg-neu-bg text-gray-800 font-black text-sm hover:neu-subtle active:neu-in transition-all flex items-center gap-4 group w-full sm:w-auto justify-center"
                >
                  <RefreshCcw className="w-6 h-6 text-blue-500 group-hover:rotate-180 transition-transform duration-700" />
                  {cur.startNew}
                </button>

                {currentRecordId && (
                  <button
                    onClick={() => deleteRecord(currentRecordId)}
                    disabled={!!deleteLoading}
                    className={`px-12 py-5 rounded-[2.5rem] font-black text-sm transition-all active:neu-in flex items-center gap-4 w-full sm:w-auto justify-center border-2 ${
                      confirmDeleteId === currentRecordId 
                        ? 'bg-red-600 border-red-700 text-white shadow-lg animate-pulse' 
                        : 'neu-out bg-neu-bg border-transparent text-red-500 hover:neu-subtle'
                    }`}
                  >
                    {deleteLoading === currentRecordId ? (
                      <RefreshCcw className="w-6 h-6 animate-spin" />
                    ) : (
                      <Trash2 className="w-6 h-6" />
                    )}
                    {confirmDeleteId === currentRecordId ? cur.confirmDelete : cur.deletePerm}
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer Info */}
      <footer className="max-w-7xl mx-auto px-6 py-16 border-t border-gray-300/30 mt-20">
        <div className="grid md:grid-cols-3 gap-16 text-center md:text-left">
          <div className="space-y-4">
            <h5 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400">{cur.logicCore}</h5>
            <p className="text-[10px] leading-loose font-black uppercase text-gray-500">
              {cur.logicDesc}
            </p>
          </div>
          <div className="flex items-center justify-center">
             <div className="w-16 h-16 rounded-[1.5rem] neu-in flex items-center justify-center">
               <BookOpen className="w-6 h-6 text-indigo-500" />
             </div>
          </div>
          <div className="space-y-4 text-right md:text-right">
            <h5 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400">{cur.poweredBy}</h5>
            <p className="text-[10px] leading-loose font-black uppercase text-gray-500">
              {cur.engineDesc}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

