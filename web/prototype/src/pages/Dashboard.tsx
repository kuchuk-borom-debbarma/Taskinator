import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { GET_ME } from '../graphql/queries';
import { CREATE_PROJECT } from '../graphql/mutations';
import DashboardLayout from '../components/layout/DashboardLayout';
import { FolderPlus, Clock, Plus, LayoutGrid } from 'lucide-react';

const Dashboard = () => {
  const { data, loading, error, refetch } = useQuery(GET_ME);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');

  const [createProject, { loading: creating }] = useMutation(CREATE_PROJECT, {
    onCompleted: () => {
      setShowCreateModal(false);
      setProjectName('');
      setProjectDesc('');
      refetch();
    }
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createProject({
      variables: {
        input: { name: projectName, description: projectDesc }
      }
    });
  };

  if (loading) return <DashboardLayout><div className="animate-pulse flex space-x-4">Loading...</div></DashboardLayout>;
  if (error) return <DashboardLayout><div className="text-red-400">Error: {error.message}</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome, {data?.me?.username}</h1>
            <p className="text-zinc-400 mt-1">Here's what's happening with your projects.</p>
          </div>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus size={18} />
            New Project
          </button>
        </div>

        {data?.me?.projects?.length === 0 ? (
          <div className="border-2 border-dashed border-zinc-800 rounded-2xl p-12 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mb-4 text-zinc-500">
              <FolderPlus size={32} />
            </div>
            <h3 className="text-xl font-semibold">No projects yet</h3>
            <p className="text-zinc-400 max-w-xs mt-2 mb-6">Create your first project to start organizing your tasks and teams.</p>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="text-indigo-400 hover:text-indigo-300 font-medium"
            >
              Get started by creating a project &rarr;
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data?.me?.projects.map((project: any) => (
              <div key={project.id} className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl hover:border-indigo-500/50 transition-all group">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 bg-indigo-600/10 rounded-lg flex items-center justify-center text-indigo-500">
                    <LayoutGrid size={20} />
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold bg-zinc-800 px-2 py-1 rounded">Active</span>
                </div>
                <h3 className="text-lg font-bold group-hover:text-indigo-400 transition-colors">{project.name}</h3>
                <p className="text-sm text-zinc-400 mt-1 line-clamp-2">{project.description || 'No description provided.'}</p>
                <div className="flex items-center gap-2 mt-6 text-zinc-500 text-xs">
                  <Clock size={14} />
                  <span>Created {new Date(parseInt(project.createdAt)).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-2xl shadow-2xl p-8 animate-in fade-in zoom-in duration-200">
            <h2 className="text-2xl font-bold mb-6">Create Project</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5 text-zinc-400">Project Name</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  placeholder="Marketing Campaign, Product Launch..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 text-zinc-400">Description (Optional)</label>
                <textarea
                  value={projectDesc}
                  onChange={(e) => setProjectDesc(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 h-24 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                  placeholder="What is this project about?"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-zinc-800 hover:bg-zinc-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 transition-colors disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Dashboard;
