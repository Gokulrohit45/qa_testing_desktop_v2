import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Download, CheckCircle, ShieldAlert } from 'lucide-react';

export default function ReportViewer({ projects, executions }) {
  const { id, runId } = useParams();
  const project = projects.find(p => p.id === parseInt(id));
  const run = executions.find(e => e.id === parseInt(runId));
  const navigate = useNavigate();

  if (!project || !run) return <div>Report details not found.</div>;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Action banner */}
      <div className="bg-[#161925] p-4 border border-[#1e2029] rounded-2xl shadow-sm flex justify-between items-center print:hidden">
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 hover:bg-[#1d2132] border border-[#1e2029] rounded-xl text-zinc-300 flex items-center gap-1.5 text-xs font-semibold"
        >
          <ArrowLeft size={14} /> Back
        </button>
        <div className="flex gap-2">
          <button 
            onClick={handlePrint}
            className="px-3 py-1.5 border border-[#1e2029] hover:bg-[#1d2132] text-zinc-300 font-semibold rounded-xl text-xs flex items-center gap-1 shadow-sm"
          >
            <Printer size={14} /> Print Report
          </button>
          <button 
            onClick={handlePrint}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
          >
            <Download size={14} /> Download PDF
          </button>
        </div>
      </div>

      {/* High Fidelity Report Body (Print Styled) */}
      <div id="printable-report" className="bg-[#161925] border border-[#1e2029] p-8 sm:p-12 shadow-md rounded-2xl print:border-none print:shadow-none print:p-0 space-y-8 text-zinc-100">
        
        {/* Report Header */}
        <div className="flex justify-between items-start border-b border-[#1e2029] pb-6">
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-zinc-100 tracking-tight">QA AUTOMATION RUN REPORT</h1>
            <p className="text-xs text-zinc-400">Document generated automatically on completion of Playwright sandbox tasks.</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-zinc-400 font-semibold uppercase">Status</div>
            <div className="text-base font-bold text-emerald-400 flex items-center gap-1 mt-0.5 justify-end">
              <CheckCircle size={16} /> Passed
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 bg-[#11131c] p-5 border border-[#1e2029] rounded-xl">
          <div>
            <div className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Project ID</div>
            <div className="text-sm font-semibold text-zinc-200 mt-0.5">#{project.id}</div>
          </div>
          <div>
            <div className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Run Reference</div>
            <div className="text-sm font-semibold text-zinc-200 mt-0.5 font-mono">#{run.id}</div>
          </div>
          <div>
            <div className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Run Date</div>
            <div className="text-sm font-semibold text-zinc-200 mt-0.5">{run.date}</div>
          </div>
          <div>
            <div className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Total Duration</div>
            <div className="text-sm font-semibold text-zinc-200 mt-0.5">{run.duration}s</div>
          </div>
        </div>

        {/* Project Target */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Project Configuration</h2>
          <div className="border border-[#1e2029] p-4 rounded-xl space-y-1 bg-[#11131c]">
            <div className="text-sm font-bold text-zinc-100">{project.name}</div>
            <div className="text-xs text-indigo-400 font-mono break-all">{project.appUrl}</div>
            <p className="text-xs text-zinc-400 pt-2 leading-relaxed">{project.description}</p>
          </div>
        </div>

        {/* Execution steps breakdown */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Playwright Execution Steps Audit</h2>
          <div className="border border-[#1e2029] rounded-xl overflow-hidden divide-y divide-[#1e2029]">
            <StepRow step="1" action="goto" args={{ url: project.appUrl }} status="PASSED" duration="0.8s" />
            <StepRow step="2" action="verify_text" args={{ text: 'Welcome' }} status="PASSED" duration="0.1s" />
            <StepRow step="3" action="click" args={{ selector: '#login-btn' }} status="PASSED" duration="0.4s" />
            <StepRow step="4" action="fill" args={{ selector: '#username', value: 'admin' }} status="PASSED" duration="0.3s" />
            <StepRow step="5" action="fill" args={{ selector: '#password', value: 'secret' }} status="PASSED" duration="0.3s" />
            <StepRow step="6" action="click" args={{ selector: '#submit' }} status="PASSED" duration="0.5s" />
            <StepRow step="7" action="verify_url" args={{ url: '/dashboard' }} status="PASSED" duration="0.2s" />
          </div>
        </div>

        {/* Report Footer */}
        <div className="border-t border-[#1e2029] pt-6 text-center text-[10px] text-zinc-500 font-semibold tracking-wider uppercase">
          Generated via Antigravity Automated AI Testing Platform.
        </div>
      </div>
    </div>
  );
}

function StepRow({ step, action, args, status, duration }) {
  return (
    <div className="p-4 flex items-center justify-between text-xs font-mono">
      <div className="flex items-center gap-3">
        <span className="text-zinc-500 font-semibold">#{step}</span>
        <div>
          <span className="font-bold text-zinc-200">{action}</span>
          <span className="text-zinc-400 ml-2 text-[10px]">{JSON.stringify(args)}</span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-zinc-500 text-[10px]">{duration}</span>
        <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 text-[10px]">
          {status}
        </span>
      </div>
    </div>
  );
}
