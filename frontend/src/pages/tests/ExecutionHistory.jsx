import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { History, Play, CheckCircle, XCircle, Clock, Eye, Download, Calendar } from 'lucide-react';

export default function ExecutionHistory({ projects, executions }) {
  const { id } = useParams();
  const project = projects.find(p => p.id === parseInt(id));
  const [filterStatus, setFilterStatus] = useState('All');

  if (!project) return <div>Project not found.</div>;

  const projExecutions = executions.filter(e => {
    const isProj = e.projectId === project.id;
    if (filterStatus === 'All') return isProj;
    return isProj && e.status === filterStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#161925] p-6 rounded-2xl border border-[#1e2029] shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Execution History</h1>
          <p className="text-zinc-400 text-xs mt-0.5">Audit log of all test runner workflows executed on {project.name}.</p>
        </div>
        <Link 
          to={`/projects/${project.id}/run`}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm shadow-sm transition-all flex items-center gap-1.5"
        >
          <Play size={14} />
          Execute Suite
        </Link>
      </div>

      {/* Filter and stats row */}
      <div className="flex justify-between items-center bg-[#161925] px-5 py-3 border border-[#1e2029] rounded-xl shadow-sm">
        <div className="flex gap-2">
          {['All', 'Passed', 'Failed'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                filterStatus === status 
                  ? 'bg-indigo-600 text-white border-indigo-600' 
                  : 'bg-[#11131c] text-zinc-400 border-[#1e2029] hover:bg-[#1d2132]'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
        <span className="text-xs font-semibold text-zinc-500 font-mono uppercase">
          {projExecutions.length} Executions Found
        </span>
      </div>

      {/* Execution table */}
      <div className="bg-[#161925] rounded-2xl border border-[#1e2029] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#11131c] text-[10px] uppercase font-bold text-zinc-400 border-b border-[#1e2029] tracking-wider">
                <th className="py-3 px-6">Run ID</th>
                <th className="py-3 px-6">Status</th>
                <th className="py-3 px-6">Duration</th>
                <th className="py-3 px-6">Date Triggered</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2029] text-sm text-zinc-200">
              {projExecutions.map(e => (
                <tr key={e.id} className="hover:bg-[#11131c]/50 transition-colors">
                  <td className="py-4 px-6 font-mono text-xs text-zinc-400">#{e.id}</td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      e.status === 'Passed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                      {e.status === 'Passed' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                      {e.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-zinc-400 font-medium flex items-center gap-1.5">
                    <Clock size={14} className="text-zinc-500" />
                    {e.duration}s
                  </td>
                  <td className="py-4 px-6 text-zinc-400 font-medium flex items-center gap-1.5">
                    <Calendar size={14} className="text-zinc-500" />
                    {e.date}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link 
                        to={`/projects/${project.id}/results/${e.id}`}
                        className="text-zinc-400 hover:text-zinc-200 transition-colors"
                        title="View result steps"
                      >
                        <Eye size={16} />
                      </Link>
                      <Link 
                        to={`/projects/${project.id}/reports/${e.id}`}
                        className="text-zinc-400 hover:text-indigo-400 transition-colors"
                        title="View full report"
                      >
                        <Download size={16} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {projExecutions.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-zinc-500">
                    No runs matched the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
