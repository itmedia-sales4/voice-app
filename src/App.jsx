import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Mic, MicOff, Copy, Trash2, Settings, History, Plus, X,
  BookA, Keyboard, Sparkles, Wand2, CheckCircle2, ChevronDown,
  Download, Upload, Edit2, Check, Search, Globe, Eye, EyeOff,
  ToggleLeft, ToggleRight, Key,
} from 'lucide-react';

// --- Constants ---
const BUILT_IN_PROMPTS = {
  clean: {
    label: 'きれいにまとめる',
    prompt: 'あなたは優秀な編集者です。提供された音声認識のテキストから、「あー」「えっと」などのフィラーや無意味な言葉を削除し、文脈を整えて、自然で分かりやすい日本語の文章に整形してください。発言の意図を汲み取り、不要な繰り返しを省いて読みやすくまとめてください。出力は整形後のテキストのみとしてください。',
    builtIn: true,
  },
  email: {
    label: 'メール返信用',
    prompt: 'あなたは優秀なビジネスパーソンです。提供された音声認識のテキストを元に、取引先への丁寧なビジネスメールを作成してください。宛名や挨拶（「いつもお世話になっております」など）は一般的なものを補完し、用件が明確に伝わるように整理してください。出力はメールの本文のみとしてください。',
    builtIn: true,
  },
  slack: {
    label: 'Slack/チャット用',
    prompt: 'あなたは優秀なビジネスパーソンです。提供された音声認識のテキストを元に、社内チャット(Slack等)で送信するのに適した、簡潔で分かりやすいメッセージを作成してください。適度に箇条書きや改行を用い、結論から述べるようにしてください。親しみやすいが丁寧なトーン（「お疲れ様です」など）にしてください。出力はメッセージ本文のみとしてください。',
    builtIn: true,
  },
};

const LANGUAGE_OPTIONS = [
  { value: 'ja-JP', label: '日本語' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'zh-CN', label: '中文 (简体)' },
  { value: 'ko-KR', label: '한국어' },
];

const DEFAULT_SHORTCUT = {
  ctrlKey: true, shiftKey: false, altKey: false, metaKey: false,
  code: 'Space', display: 'Ctrl + Space',
};
const STORAGE_PREFIX = 'transcription_app_';

// --- Helper ---
const saveToLocalStorage = (key, data) => {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(data));
  } catch (e) {
    console.error(`Failed to save ${key}:`, e);
  }
};

export default function App() {
  // --- Recording state ---
  const [isRecording, setIsRecording] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [interimText, setInterimText] = useState('');
  const [isEditingText, setIsEditingText] = useState(false);

  // --- AI state ---
  const [aiText, setAiText] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiPromptType, setAiPromptType] = useState('clean');

  // --- Settings state ---
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [autoAiEnabled, setAutoAiEnabled] = useState(true);
  const [recognitionLang, setRecognitionLang] = useState('ja-JP');
  const [customPrompts, setCustomPrompts] = useState([]);
  const [customPromptLabel, setCustomPromptLabel] = useState('');
  const [customPromptText, setCustomPromptText] = useState('');
  const [shortcut, setShortcut] = useState(DEFAULT_SHORTCUT);
  const [isRecordingShortcut, setIsRecordingShortcut] = useState(false);

  // --- Sidebar / data state ---
  const [activeTab, setActiveTab] = useState('history');
  const [histories, setHistories] = useState([]);
  const [dictionary, setDictionary] = useState([]);
  const [dictBefore, setDictBefore] = useState('');
  const [dictAfter, setDictAfter] = useState('');

  // --- History filter state ---
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilter, setHistoryFilter] = useState('all');

  // --- Toast ---
  const [toastMessage, setToastMessage] = useState('');

  // --- Refs ---
  const recognitionRef = useRef(null);
  const isRecordingRef = useRef(false);
  const dictionaryRef = useRef([]);
  const shortcutRef = useRef(DEFAULT_SHORTCUT);
  const aiPromptTypeRef = useRef('clean');
  const currentTextRef = useRef('');
  const interimTextRef = useRef('');
  const apiKeyRef = useRef('');
  const langRef = useRef('ja-JP');
  const autoAiRef = useRef(true);
  const customPromptsRef = useRef([]);
  const fileInputRef = useRef(null);

  // --- State → Ref sync ---
  useEffect(() => { shortcutRef.current = shortcut; }, [shortcut]);
  useEffect(() => { aiPromptTypeRef.current = aiPromptType; }, [aiPromptType]);
  useEffect(() => { currentTextRef.current = currentText; }, [currentText]);
  useEffect(() => { interimTextRef.current = interimText; }, [interimText]);
  useEffect(() => { apiKeyRef.current = apiKey; }, [apiKey]);
  useEffect(() => { langRef.current = recognitionLang; }, [recognitionLang]);
  useEffect(() => { autoAiRef.current = autoAiEnabled; }, [autoAiEnabled]);
  useEffect(() => { customPromptsRef.current = customPrompts; }, [customPrompts]);

  // --- Persist settings to localStorage on change ---
  useEffect(() => { saveToLocalStorage('apiKey', apiKey); }, [apiKey]);
  useEffect(() => { saveToLocalStorage('autoAiEnabled', autoAiEnabled); }, [autoAiEnabled]);
  useEffect(() => { saveToLocalStorage('recognitionLang', recognitionLang); }, [recognitionLang]);
  useEffect(() => { saveToLocalStorage('customPrompts', customPrompts); }, [customPrompts]);

  // --- Computed ---
  const allPrompts = useMemo(() => ({
    ...BUILT_IN_PROMPTS,
    ...Object.fromEntries(customPrompts.map(p => [p.id, { label: p.label, prompt: p.prompt }])),
  }), [customPrompts]);

  // --- 1. Load from localStorage ---
  useEffect(() => {
    try {
      const saved = (key) => {
        const v = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
        return v ? JSON.parse(v) : null;
      };

      const histories = saved('histories');
      if (histories) setHistories(histories);

      const dict = saved('dictionary');
      if (dict) { setDictionary(dict); dictionaryRef.current = dict; }

      const sc = saved('shortcut');
      if (sc) setShortcut(sc);

      const key = saved('apiKey');
      if (key) setApiKey(key);

      const autoAi = saved('autoAiEnabled');
      if (autoAi !== null) setAutoAiEnabled(autoAi);

      const lang = saved('recognitionLang');
      if (lang) { setRecognitionLang(lang); langRef.current = lang; }

      const cp = saved('customPrompts');
      if (cp) { setCustomPrompts(cp); customPromptsRef.current = cp; }
    } catch (e) {
      console.error('Failed to load localStorage:', e);
    }
  }, []);

  // --- 2. Speech Recognition Setup ---
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('お使いのブラウザは音声認識をサポートしていません。Google Chromeをご利用ください。');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = langRef.current;
    recognition.continuous = true;
    recognition.interimResults = true;

    const applyDictionary = (text) => {
      let result = text;
      dictionaryRef.current.forEach(({ before, after }) => {
        if (before && after) result = result.split(before).join(after);
      });
      return result;
    };

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript;
        else interim += event.results[i][0].transcript;
      }
      if (final) setCurrentText(prev => prev + applyDictionary(final) + '。');
      setInterimText(applyDictionary(interim));
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') stopRecording();
    };

    recognition.onend = () => {
      if (isRecordingRef.current) {
        try {
          recognition.lang = langRef.current;
          recognition.start();
        } catch (e) {
          console.error('Failed to restart recognition:', e);
        }
      }
    };

    recognitionRef.current = recognition;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- 3. Recording Handlers ---
  const startRecording = () => {
    if (recognitionRef.current && !isRecordingRef.current) {
      try {
        setIsEditingText(false);
        recognitionRef.current.lang = langRef.current;
        recognitionRef.current.start();
        isRecordingRef.current = true;
        setIsRecording(true);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecordingRef.current) {
      recognitionRef.current.stop();
      isRecordingRef.current = false;
      setIsRecording(false);

      const interim = interimTextRef.current;
      let textToProcess = currentTextRef.current;
      if (interim) textToProcess += interim + '。';
      textToProcess = textToProcess.trim();
      setInterimText('');

      if (textToProcess) {
        setCurrentText(textToProcess);
        saveTextToHistory(textToProcess, 'raw');
        if (autoAiRef.current) handleAIFormat(textToProcess);
      }
    }
  };

  const toggleRecording = () => {
    if (isRecordingRef.current) stopRecording();
    else startRecording();
  };

  const clearCurrentText = () => {
    setCurrentText('');
    setInterimText('');
    setAiText('');
    setAiError('');
    setIsEditingText(false);
  };

  // --- 4. Toast ---
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // --- 5. Clipboard ---
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast('コピーしました');
    } catch {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      try { document.execCommand('copy'); showToast('コピーしました'); }
      catch { showToast('コピーに失敗しました'); }
      document.body.removeChild(el);
    }
  };

  const copyToClipboardSilent = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch {}
      document.body.removeChild(el);
      return ok;
    }
  };

  // --- 6. History ---
  const saveTextToHistory = (text, type = 'raw') => {
    if (!text.trim()) return;
    const newEntry = { id: Date.now().toString(), text: text.trim(), type, createdAt: Date.now() };
    setHistories(prev => {
      const updated = [newEntry, ...prev].slice(0, 50);
      saveToLocalStorage('histories', updated);
      return updated;
    });
  };

  const handleDeleteHistory = (id) => {
    setHistories(prev => {
      const updated = prev.filter(h => h.id !== id);
      saveToLocalStorage('histories', updated);
      return updated;
    });
  };

  const handleExportHistory = () => {
    if (histories.length === 0) { alert('エクスポートする履歴データがありません。'); return; }
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(histories));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', 'history_backup.json');
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast('履歴データをダウンロードしました');
  };

  // --- 7. Filtered histories ---
  const filteredHistories = useMemo(() => {
    return histories.filter(h => {
      const matchType = historyFilter === 'all' || h.type === historyFilter;
      const matchSearch = !historySearch || h.text.toLowerCase().includes(historySearch.toLowerCase());
      return matchType && matchSearch;
    });
  }, [histories, historyFilter, historySearch]);

  // --- 8. AI Format ---
  const generateAIContent = async (text, systemPromptText) => {
    const key = apiKeyRef.current;
    if (!key) throw new Error('API_KEY_NOT_SET');

    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${key}`;
    const payload = {
      contents: [{ parts: [{ text: `${systemPromptText}\n\n${text}` }] }],
    };

    const fetchWithRetry = async (retries = 5, delay = 1000) => {
      for (let i = 0; i < retries; i++) {
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (!res.ok) {
            const body = await res.text().catch(() => '');
            throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
          }
          const result = await res.json();
          return result.candidates?.[0]?.content?.parts?.[0]?.text || '整形結果を取得できませんでした。';
        } catch (err) {
          if (i === retries - 1) throw err;
          await new Promise(r => setTimeout(r, delay));
          delay *= 2;
        }
      }
    };

    return await fetchWithRetry();
  };

  const handleAIFormat = async (textOverride) => {
    const targetText = typeof textOverride === 'string' && textOverride
      ? textOverride
      : currentTextRef.current;
    if (!targetText.trim()) return;

    if (!apiKeyRef.current) {
      setAiError('APIキーが設定されていません。右の設定タブから Gemini APIキーを入力してください。');
      return;
    }

    setIsAiLoading(true);
    setAiError('');
    try {
      const currentAllPrompts = {
        ...BUILT_IN_PROMPTS,
        ...Object.fromEntries(customPromptsRef.current.map(p => [p.id, { label: p.label, prompt: p.prompt }])),
      };
      const systemPromptText = currentAllPrompts[aiPromptTypeRef.current]?.prompt;
      if (!systemPromptText) { setAiError('プロンプトが見つかりません。'); return; }

      const formattedText = await generateAIContent(targetText.trim(), systemPromptText);
      setAiText(formattedText);
      saveTextToHistory(formattedText, 'ai');

      const copied = await copyToClipboardSilent(formattedText);
      showToast(copied ? '処理完了 ＆ クリップボードにコピーしました' : 'AIによる整形が完了しました');
    } catch (err) {
      if (err.message === 'API_KEY_NOT_SET') {
        setAiError('APIキーが設定されていません。設定タブから入力してください。');
      } else {
        console.error('AI format error:', err);
        setAiError(`AIによる整形に失敗しました。エラー: ${err.message}`);
      }
    } finally {
      setIsAiLoading(false);
    }
  };

  // --- 9. Dictionary Handlers ---
  const handleAddDictionary = (e) => {
    e.preventDefault();
    if (!dictBefore.trim() || !dictAfter.trim()) return;
    const newItem = { id: Date.now().toString(), before: dictBefore.trim(), after: dictAfter.trim(), createdAt: Date.now() };
    setDictionary(prev => {
      const updated = [...prev, newItem];
      saveToLocalStorage('dictionary', updated);
      dictionaryRef.current = updated;
      return updated;
    });
    setDictBefore('');
    setDictAfter('');
  };

  const handleDeleteDictionary = (id) => {
    setDictionary(prev => {
      const updated = prev.filter(item => item.id !== id);
      saveToLocalStorage('dictionary', updated);
      dictionaryRef.current = updated;
      return updated;
    });
  };

  const handleExportDictionary = () => {
    if (dictionary.length === 0) { alert('エクスポートする辞書データがありません。'); return; }
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(dictionary));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', 'dictionary_backup.json');
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast('辞書データをダウンロードしました');
  };

  const handleImportDictionary = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        if (!Array.isArray(importedData)) throw new Error('Invalid format');
        setDictionary(prev => {
          const merged = [...prev];
          importedData.forEach(item => {
            const idx = merged.findIndex(ex => ex.before === item.before);
            if (idx >= 0) merged[idx] = { ...merged[idx], after: item.after };
            else merged.push({ ...item, id: item.id || `${Date.now()}${Math.random()}` });
          });
          saveToLocalStorage('dictionary', merged);
          dictionaryRef.current = merged;
          return merged;
        });
        showToast('辞書データをインポートしました');
      } catch { alert('ファイルの読み込みに失敗しました。正しいバックアップファイルを選択してください。'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // --- 10. Custom Prompts ---
  const handleAddCustomPrompt = (e) => {
    e.preventDefault();
    if (!customPromptLabel.trim() || !customPromptText.trim()) return;
    const newPrompt = {
      id: `custom_${Date.now()}`,
      label: customPromptLabel.trim(),
      prompt: customPromptText.trim(),
      createdAt: Date.now(),
    };
    setCustomPrompts(prev => [...prev, newPrompt]);
    setCustomPromptLabel('');
    setCustomPromptText('');
    showToast('カスタムプロンプトを追加しました');
  };

  const handleDeleteCustomPrompt = (id) => {
    setCustomPrompts(prev => prev.filter(p => p.id !== id));
    if (aiPromptType === id) setAiPromptType('clean');
  };

  // --- 11. Shortcut ---
  const saveShortcut = (newShortcut) => {
    setShortcut(newShortcut);
    setIsRecordingShortcut(false);
    saveToLocalStorage('shortcut', newShortcut);
    showToast('ショートカットを保存しました');
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isRecordingShortcut) return;
      const sc = shortcutRef.current;
      if (
        sc.ctrlKey === e.ctrlKey && sc.shiftKey === e.shiftKey &&
        sc.altKey === e.altKey && sc.metaKey === e.metaKey &&
        (sc.code === e.code || sc.key?.toLowerCase() === e.key?.toLowerCase())
      ) {
        e.preventDefault();
        toggleRecording();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecordingShortcut]);

  const handleShortcutInput = (e) => {
    e.preventDefault();
    if (!isRecordingShortcut) return;
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;
    const parts = [];
    if (e.metaKey) parts.push('Cmd/Win');
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');
    let keyName = e.code === 'Space' ? 'Space'
      : e.code.startsWith('Key') ? e.code.replace('Key', '')
      : e.code.startsWith('Digit') ? e.code.replace('Digit', '')
      : e.code;
    parts.push(keyName);
    saveShortcut({ ctrlKey: e.ctrlKey, shiftKey: e.shiftKey, altKey: e.altKey, metaKey: e.metaKey, code: e.code, key: e.key, display: parts.join(' + ') });
  };

  // --- Render ---
  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-50 text-gray-800 font-sans">

      {/* ===== Left: Main Area ===== */}
      <div className="flex-1 flex flex-col h-full border-r border-gray-200 min-w-0">

        <header className="bg-white border-b border-gray-200 p-4 flex justify-between items-center shrink-0">
          <h1 className="text-xl font-bold flex items-center gap-2 text-gray-800">
            <Mic className="text-blue-500" size={24} />
            リアルタイム文字起こし
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full ml-2">ローカル保存版</span>
          </h1>
          <div className="hidden md:flex items-center text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full border border-gray-200">
            <Keyboard size={14} className="mr-1 opacity-70" />
            <span className="font-mono font-semibold mx-1 text-gray-700">{shortcut.display}</span> で開始/停止
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-4">

          {/* Raw text panel */}
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 flex flex-col relative min-h-[200px]">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                <Mic size={14} /> 音声認識 (生データ)
              </h3>
              <button
                onClick={() => setIsEditingText(v => !v)}
                disabled={isRecording}
                className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-colors
                  ${isEditingText
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-500 border-gray-300 hover:border-blue-400 hover:text-blue-500'}
                  disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {isEditingText ? <><Check size={12} /> 完了</> : <><Edit2 size={12} /> 編集</>}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {isEditingText ? (
                <textarea
                  value={currentText}
                  onChange={(e) => setCurrentText(e.target.value)}
                  className="w-full h-full min-h-[150px] text-base md:text-lg leading-relaxed text-gray-800 resize-none border-0 outline-none p-0 bg-transparent"
                  placeholder="テキストを編集できます..."
                  autoFocus
                />
              ) : (
                <div className="text-base md:text-lg leading-relaxed text-gray-800 whitespace-pre-wrap">
                  {currentText || <span className="text-gray-400 italic">ここに文字起こしされたテキストが表示されます...</span>}
                  <span className="text-blue-500 opacity-80">{interimText}</span>
                </div>
              )}
            </div>

            {isRecording && (
              <div className="absolute top-4 right-4 flex items-center gap-2 text-red-500 text-sm font-medium">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                録音中
              </div>
            )}
          </div>

          {/* AI panel */}
          <div className="flex-1 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-sm border border-blue-100 p-4 md:p-6 flex flex-col relative min-h-[200px]">
            <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
              <h3 className="text-xs font-bold text-blue-700 uppercase flex items-center gap-1">
                <Sparkles size={14} className="text-blue-500" /> AI処理
              </h3>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <select
                    value={aiPromptType}
                    onChange={(e) => setAiPromptType(e.target.value)}
                    className="appearance-none bg-white border border-blue-200 text-blue-700 text-xs md:text-sm py-1.5 pl-3 pr-8 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm font-medium"
                  >
                    <optgroup label="ビルトイン">
                      {Object.entries(BUILT_IN_PROMPTS).map(([key, val]) => (
                        <option key={key} value={key}>{val.label}</option>
                      ))}
                    </optgroup>
                    {customPrompts.length > 0 && (
                      <optgroup label="カスタム">
                        {customPrompts.map(p => (
                          <option key={p.id} value={p.id}>{p.label}</option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" />
                </div>
                <button
                  onClick={() => handleAIFormat()}
                  disabled={isAiLoading || !currentText}
                  className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white text-xs md:text-sm font-medium py-1.5 px-4 rounded-full shadow-sm transition-all active:scale-95 whitespace-nowrap"
                >
                  {isAiLoading
                    ? <><div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div> 処理中...</>
                    : <><Wand2 size={16} /> 実行</>}
                </button>
              </div>
            </div>

            {aiError && (
              <div className="text-red-600 text-sm mb-2 font-medium bg-red-50 p-2.5 rounded-lg border border-red-100">
                {aiError}
              </div>
            )}

            <div className="flex-1 overflow-y-auto text-base md:text-lg leading-relaxed text-gray-800 whitespace-pre-wrap">
              {aiText ? (
                <div className="bg-white/60 p-4 rounded-lg border border-white/40 shadow-inner">{aiText}</div>
              ) : (
                <div className="h-full flex items-center justify-center text-blue-400/60 text-sm font-medium italic border-2 border-dashed border-blue-200/50 rounded-lg p-4 text-center">
                  右上のプルダウンからフォーマットを選び、<br className="hidden md:block" />録音を停止するとここにAIの処理結果が表示されます
                </div>
              )}
            </div>

            {aiText && (
              <button
                onClick={() => copyToClipboard(aiText)}
                className="absolute bottom-6 right-6 p-2.5 bg-white rounded-full shadow-md border border-gray-200 text-gray-600 hover:text-blue-600 transition-colors"
                title="AI整形テキストをコピー"
              >
                <Copy size={18} />
              </button>
            )}
          </div>

        </main>

        <footer className="bg-white border-t border-gray-200 p-4 md:p-6 flex flex-col items-center justify-center shrink-0">
          <div className="flex items-center gap-6">
            <button onClick={() => copyToClipboard(currentText)} className="p-3 rounded-full hover:bg-gray-100 text-gray-600 transition-colors" title="生データをコピー">
              <Copy size={22} />
            </button>
            <button
              onClick={toggleRecording}
              className={`p-5 rounded-full text-white shadow-lg transition-all duration-200 ${isRecording ? 'bg-red-500 hover:bg-red-600 animate-pulse scale-110' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {isRecording ? <MicOff size={32} /> : <Mic size={32} />}
            </button>
            <button onClick={clearCurrentText} className="p-3 rounded-full hover:bg-red-50 text-gray-600 hover:text-red-500 transition-colors" title="クリア">
              <Trash2 size={22} />
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-4 font-medium">
            {isRecording ? 'ボタンを押すと停止します' : 'マイクボタンを押して録音を開始'}
          </p>
        </footer>
      </div>

      {/* ===== Right: Sidebar ===== */}
      <div className="w-full md:w-80 bg-white h-full flex flex-col shrink-0 border-t md:border-t-0 border-gray-200">
        <div className="flex border-b border-gray-200">
          {[
            { key: 'history', icon: <History size={16} />, label: '履歴' },
            { key: 'dictionary', icon: <BookA size={16} />, label: '辞書' },
            { key: 'settings', icon: <Settings size={16} />, label: '設定' },
          ].map(tab => (
            <button
              key={tab.key}
              className={`flex-1 py-4 text-xs md:text-sm font-medium flex items-center justify-center gap-1.5 transition-colors
                ${activeTab === tab.key ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50">

          {/* ---- History Tab ---- */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              {/* Search */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="履歴を検索..."
                  className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              {/* Filter + Export */}
              <div className="flex gap-1">
                {[['all', '全て'], ['raw', '生データ'], ['ai', 'AI整形']].map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setHistoryFilter(key)}
                    className={`flex-1 text-xs py-1.5 rounded-full border transition-colors
                      ${historyFilter === key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300'}`}
                  >
                    {label}
                  </button>
                ))}
                <button
                  onClick={handleExportHistory}
                  className="px-2.5 text-xs py-1.5 rounded-full bg-white text-gray-500 border border-gray-200 hover:border-blue-300 hover:text-blue-500 transition-colors"
                  title="履歴をエクスポート"
                >
                  <Download size={13} />
                </button>
              </div>

              {/* List */}
              {filteredHistories.length === 0 ? (
                <p className="text-sm text-gray-500 text-center mt-8">
                  {histories.length === 0 ? '保存された履歴はありません' : '一致する履歴がありません'}
                </p>
              ) : (
                filteredHistories.map(hist => (
                  <div key={hist.id} className={`p-3 rounded-lg border shadow-sm relative group transition-colors ${hist.type === 'ai' ? 'bg-blue-50/30 border-blue-100' : 'bg-white border-gray-200'}`}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      {hist.type === 'ai' ? <Sparkles size={12} className="text-blue-500" /> : <Mic size={12} className="text-gray-400" />}
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${hist.type === 'ai' ? 'text-blue-500' : 'text-gray-400'}`}>
                        {hist.type === 'ai' ? 'AI整形済' : '生データ'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-800 line-clamp-3 mb-3 leading-relaxed">{hist.text}</p>
                    <div className="flex justify-between items-center text-xs text-gray-400">
                      <span>{new Date(hist.createdAt).toLocaleString([], { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => copyToClipboard(hist.text)} className="p-1.5 hover:text-blue-500 hover:bg-blue-50 rounded"><Copy size={14} /></button>
                        <button onClick={() => handleDeleteHistory(hist.id)} className="p-1.5 hover:text-red-500 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ---- Dictionary Tab ---- */}
          {activeTab === 'dictionary' && (
            <div className="flex flex-col h-full">
              <div className="flex gap-2 mb-4 bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
                <button onClick={handleExportDictionary} className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 py-1.5 rounded transition-colors">
                  <Download size={14} /> エクスポート
                </button>
                <div className="w-[1px] bg-gray-200" />
                <input type="file" accept=".json" ref={fileInputRef} onChange={handleImportDictionary} className="hidden" />
                <button onClick={() => fileInputRef.current.click()} className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-gray-600 hover:text-green-600 hover:bg-green-50 py-1.5 rounded transition-colors">
                  <Upload size={14} /> インポート
                </button>
              </div>

              <form onSubmit={handleAddDictionary} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm mb-4">
                <div className="mb-2">
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">誤変換される言葉</label>
                  <input type="text" value={dictBefore} onChange={e => setDictBefore(e.target.value)} placeholder="例: キャンパス" className="w-full text-sm p-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" required />
                </div>
                <div className="mb-3">
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">正しい言葉</label>
                  <input type="text" value={dictAfter} onChange={e => setDictAfter(e.target.value)} placeholder="例: Canvas" className="w-full text-sm p-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" required />
                </div>
                <button type="submit" className="w-full bg-blue-50 text-blue-600 text-sm font-medium py-2 rounded flex items-center justify-center gap-1 hover:bg-blue-100 transition-colors">
                  <Plus size={16} /> 辞書に登録
                </button>
              </form>

              <div className="space-y-2">
                <h3 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">登録済みリスト</h3>
                {dictionary.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center">辞書は登録されていません</p>
                ) : (
                  dictionary.map(item => (
                    <div key={item.id} className="bg-white p-2 rounded border border-gray-200 flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-2 text-sm overflow-hidden">
                        <span className="text-red-500 line-through truncate max-w-[80px]" title={item.before}>{item.before}</span>
                        <span className="text-gray-400">→</span>
                        <span className="text-green-600 font-medium truncate max-w-[80px]" title={item.after}>{item.after}</span>
                      </div>
                      <button onClick={() => handleDeleteDictionary(item.id)} className="text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-gray-100">
                        <X size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ---- Settings Tab ---- */}
          {activeTab === 'settings' && (
            <div className="space-y-6">

              {/* API Key */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <Key size={16} className="text-gray-500" /> Gemini APIキー
                </h3>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full text-sm p-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(v => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">Google AI Studioで取得したキーを入力してください。入力は自動保存されます。</p>
              </div>

              {/* Language */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <Globe size={16} className="text-gray-500" /> 認識言語
                </h3>
                <div className="relative">
                  <select
                    value={recognitionLang}
                    onChange={(e) => setRecognitionLang(e.target.value)}
                    className="w-full appearance-none text-sm p-2 pr-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {LANGUAGE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                <p className="text-xs text-gray-500 mt-1">次の録音開始から反映されます。</p>
              </div>

              {/* Auto AI */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <Wand2 size={16} className="text-gray-500" /> 録音停止後にAI自動実行
                </h3>
                <button
                  onClick={() => setAutoAiEnabled(v => !v)}
                  className={`flex items-center gap-2 w-full p-3 rounded-lg border transition-colors ${autoAiEnabled ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-600'}`}
                >
                  {autoAiEnabled
                    ? <ToggleRight size={22} className="text-blue-600" />
                    : <ToggleLeft size={22} className="text-gray-400" />}
                  <span className="text-sm font-medium">{autoAiEnabled ? 'ON（自動実行する）' : 'OFF（手動で実行する）'}</span>
                </button>
              </div>

              {/* Shortcut */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <Keyboard size={16} className="text-gray-500" /> ショートカットキー設定
                </h3>
                <p className="text-xs text-gray-500 mb-3">録音の開始/停止を切り替えるキーを設定します。</p>
                <div
                  className={`p-4 rounded-lg border-2 text-center cursor-pointer transition-colors
                    ${isRecordingShortcut ? 'border-blue-500 bg-blue-50 ring-4 ring-blue-500/20' : 'border-gray-300 bg-white hover:border-blue-300 hover:bg-gray-50'}`}
                  tabIndex={0}
                  onClick={() => setIsRecordingShortcut(true)}
                  onBlur={() => setIsRecordingShortcut(false)}
                  onKeyDown={handleShortcutInput}
                >
                  {isRecordingShortcut ? (
                    <div className="text-blue-600 font-medium animate-pulse">
                      新しいキーを入力してください...<br />
                      <span className="text-xs font-normal text-blue-400">クリック外でキャンセル</span>
                    </div>
                  ) : (
                    <div className="font-mono text-lg font-semibold text-gray-700">{shortcut.display}</div>
                  )}
                </div>
              </div>

              {/* Custom Prompts */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <Sparkles size={16} className="text-gray-500" /> カスタムプロンプト
                </h3>
                <form onSubmit={handleAddCustomPrompt} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm mb-3">
                  <div className="mb-2">
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">プロンプト名</label>
                    <input
                      type="text"
                      value={customPromptLabel}
                      onChange={e => setCustomPromptLabel(e.target.value)}
                      placeholder="例: 議事録作成"
                      className="w-full text-sm p-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">AIへの指示</label>
                    <textarea
                      value={customPromptText}
                      onChange={e => setCustomPromptText(e.target.value)}
                      placeholder="例: 会議の議事録として箇条書きでまとめてください..."
                      className="w-full text-sm p-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 h-20 resize-none"
                      required
                    />
                  </div>
                  <button type="submit" className="w-full bg-blue-50 text-blue-600 text-sm font-medium py-2 rounded flex items-center justify-center gap-1 hover:bg-blue-100 transition-colors">
                    <Plus size={16} /> プロンプトを追加
                  </button>
                </form>

                {customPrompts.length > 0 && (
                  <div className="space-y-2">
                    {customPrompts.map(p => (
                      <div key={p.id} className="bg-white p-2 rounded border border-gray-200 flex items-start justify-between shadow-sm gap-2">
                        <div className="overflow-hidden flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-700 truncate">{p.label}</p>
                          <p className="text-xs text-gray-400 line-clamp-2 mt-0.5">{p.prompt}</p>
                        </div>
                        <button onClick={() => handleDeleteCustomPrompt(p.id)} className="text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-gray-100 shrink-0">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Security notice */}
              <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                <h4 className="text-xs font-bold text-yellow-800 mb-1">セキュリティについて</h4>
                <p className="text-xs text-yellow-700 leading-relaxed">
                  履歴・辞書・設定データはブラウザ内（ローカル）にのみ保存されます。
                  ※音声の文字化とAI要約の際のみ、外部APIとの通信が発生します。
                </p>
              </div>

            </div>
          )}

        </div>
      </div>

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm z-50 animate-bounce">
          <CheckCircle2 size={16} className="text-green-400" />
          {toastMessage}
        </div>
      )}
    </div>
  );
}
