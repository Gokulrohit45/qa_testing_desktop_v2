import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Play, ArrowLeft, Settings2, Sliders, ToggleLeft, ToggleRight } from 'lucide-react';

export default function RunTest({ projects, testCases }) {
  const { id } = useParams();
  const project = projects.find(p => p.id === parseInt(id));
  const navigate = useNavigate();
  const location = useLocation();
  const preSelectedTest = location.state?.preSelectedTest;

  const projTests = testCases.filter(t => t.projectId === project?.id);

  const [selectedTestId, setSelectedTestId] = useState(preSelectedTest || projTests[0]?.id || '');
  const [headless, setHeadless] = useState(true);
  const [timeout, setTimeoutVal] = useState(30);
  const [browser, setBrowser] = useState('Chromium');

  if (!project) return <div>Project not found.</div>;

  const handleLaunch = (e) => {
    e.preventDefault();
    if (!selectedTestId) return;

    navigate(`/projects/${project.id}/live`, {
      state: {
        testId: parseInt(selectedTestId),
        headless,
        timeout,
        browser
      }
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 bg-[#1d2132] hover:bg-[#252a3f] border border-[#2a2f45] rounded-xl text-zinc-300 transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Run Test Suite</h1>
          <p className="text-zinc-400 text-xs mt-0.5">Initialize execution params and run automated Playwright browser tasks.</p>
        </div>
      </div>

      <form onSubmit={handleLaunch} className="bg-[#161925] rounded-2xl border border-[#1e2029] overflow-hidden shadow-sm">
        <div className="p-6 space-y-6">
          {/* Select Suite */}
          <div>
            <label className="block text-sm font-semibold text-zinc-300 mb-2">
              Select Test Case
            </label>
            <select
              value={selectedTestId}
              onChange={(e) => setSelectedTestId(e.target.value)}
              className="w-full bg-[#11131c] border border-[#1e2029] text-zinc-100 text-sm rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none cursor-pointer"
            >
              <option value="" disabled>-- Select a test case --</option>
              {projTests.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.type.toUpperCase()})</option>
              ))}
            </select>
          </div>

          <hr className="border-[#1e2029]" />

          {/* Config Parameters */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Settings2 size={14} />
              Runner Configuration
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-2">
                  Browser Engine
                </label>
                <select
                  value={browser}
                  onChange={(e) => setBrowser(e.target.value)}
                  className="w-full bg-[#11131c] border border-[#1e2029] text-zinc-100 text-sm rounded-xl px-3 py-2.5 outline-none"
                >
                  <option value="Chromium">Chromium (Chrome)</option>
                  <option value="Firefox">Firefox</option>
                  <option value="Webkit">Webkit (Safari)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-2">
                  Action Timeout (Seconds)
                </label>
                <input
                  type="number"
                  value={timeout}
                  onChange={(e) => setTimeoutVal(parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-[#11131c] border border-[#1e2029] rounded-xl text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all"
                />
              </div>
            </div>

            <div className="flex items-center justify-between py-2.5 border-t border-[#1e2029]">
              <div>
                <div className="text-sm font-semibold text-zinc-200">Headless Execution</div>
                <div className="text-xs text-zinc-400">Run the browser sandbox invisibly on the background server.</div>
              </div>
              <button
                type="button"
                onClick={() => setHeadless(!headless)}
                className="focus:outline-none"
              >
                {headless ? (
                  <ToggleRight size={40} className="text-indigo-500 cursor-pointer" />
                ) : (
                  <ToggleLeft size={40} className="text-zinc-600 cursor-pointer" />
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 bg-[#11131c] border-t border-[#1e2029] flex justify-end">
          <button
            type="submit"
            disabled={!selectedTestId}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-xl text-sm shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Play size={14} />
            Start Execution
          </button>
        </div>
      </form>
    </div>
  );
}
