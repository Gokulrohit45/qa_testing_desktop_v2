import React, { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Sparkles, AlertCircle } from 'lucide-react';

export default function CommandEditor({ projects, testCases, setTestCases }) {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const testCase = location.state?.testCase;

  const [nlScript, setNlScript] = useState(testCase?.commands || 'Open Login Page\nEnter Username\nEnter Password\nClick Submit\nVerify welcome text');
  const [jsonOutput, setJsonOutput] = useState(JSON.stringify([
    { "action": "goto", "args": { "url": "https://example-shop.com" } },
    { "action": "fill", "args": { "selector": "#username", "value": "testuser" } },
    { "action": "fill", "args": { "selector": "#password", "value": "password123" } },
    { "action": "click", "args": { "selector": "button[type='submit']" } },
    { "action": "verify_text", "args": { "text": "Welcome to your account" } }
  ], null, 2));

  const [aiAnalyzing, setAiAnalyzing] = useState(false);

  const handleTranslate = () => {
    setAiAnalyzing(true);
    setTimeout(() => {
      // Mock parsing new lines
      const lines = nlScript.split('\n').filter(Boolean);
      const actions = lines.map(line => {
        const lower = line.toLowerCase();
        if (lower.includes('open') || lower.includes('goto')) {
          return { "action": "goto", "args": { "url": "https://example.com" } };
        } else if (lower.includes('click')) {
          return { "action": "click", "args": { "selector": "button" } };
        } else if (lower.includes('enter') || lower.includes('fill')) {
          return { "action": "fill", "args": { "selector": "input", "value": "mock_value" } };
        } else if (lower.includes('verify')) {
          return { "action": "verify_text", "args": { "text": "Expected Text" } };
        }
        return { "action": "wait", "args": { "seconds": 2 } };
      });
      setJsonOutput(JSON.stringify(actions, null, 2));
      setAiAnalyzing(false);
    }, 1200);
  };

  const handleSave = () => {
    if (testCase) {
      setTestCases(testCases.map(t => t.id === testCase.id ? { ...t, commands: nlScript } : t));
    }
    navigate(`/projects/${id}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center bg-[#161925] p-6 rounded-2xl border border-[#1e2029] shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 bg-[#1d2132] hover:bg-[#252a3f] border border-[#2a2f45] rounded-xl text-zinc-300 transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-zinc-100">Command Editor</h1>
            <p className="text-zinc-400 text-xs mt-0.5">Edit natural language workflows and preview Playwright execution structures.</p>
          </div>
        </div>

        <button 
          onClick={handleSave}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm shadow-sm flex items-center gap-1.5 transition-colors"
        >
          <Save size={16} />
          Save Workspace
        </button>
      </div>

      {/* Editor Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side: Natural Language Input */}
        <div className="bg-[#161925] rounded-2xl border border-[#1e2029] overflow-hidden shadow-sm flex flex-col h-[550px]">
          <div className="p-4 bg-[#11131c] border-b border-[#1e2029] flex justify-between items-center">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Natural Language Commands</span>
            <button 
              onClick={handleTranslate}
              disabled={aiAnalyzing}
              className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1"
            >
              <Sparkles size={12} />
              {aiAnalyzing ? 'Converting...' : 'Gemini Translate'}
            </button>
          </div>
          <textarea
            value={nlScript}
            onChange={(e) => setNlScript(e.target.value)}
            className="flex-1 w-full p-6 font-mono text-xs text-zinc-100 bg-[#0b0c10] focus:outline-none resize-none leading-relaxed"
            placeholder="Type your automation workflow instructions here..."
          />
        </div>

        {/* Right Side: Structured JSON Result */}
        <div className="bg-[#161925] rounded-2xl border border-[#1e2029] overflow-hidden shadow-sm flex flex-col h-[550px]">
          <div className="p-4 bg-[#11131c] border-b border-[#1e2029] flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Structured JSON Actions</span>
            <span className="bg-emerald-500/10 text-emerald-400 text-[9px] px-1.5 py-0.5 rounded font-bold border border-emerald-500/20 flex items-center gap-0.5">
              <AlertCircle size={8} />
              Playwright Ready
            </span>
          </div>
          <textarea
            value={jsonOutput}
            onChange={(e) => setJsonOutput(e.target.value)}
            className="flex-1 w-full p-6 font-mono text-xs text-zinc-300 bg-[#0b0c10] focus:outline-none resize-none leading-relaxed"
            placeholder="Parsed JSON schema will compile here..."
          />
        </div>
      </div>
    </div>
  );
}
