'use client';

import { useState, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function Home() {
  const [greeting, setGreeting] = useState('');
  const [health, setHealth] = useState(null);
  const [name, setName] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // User state
  const [users, setUsers] = useState([]);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [isUsersLoading, setIsUsersLoading] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/health`)
      .then((res) => res.json())
      .then((data) => setHealth(data))
      .catch((err) => setError(err.message));
    
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/api/users`);
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error("Failed to fetch users", err);
    }
  };

  const handleGreet = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/greet?name=${encodeURIComponent(name || 'World')}`);
      const data = await res.json();
      setGreeting(data.message);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail) return;
    
    setIsUsersLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newUserName, email: newUserEmail })
      });
      if (!res.ok) throw new Error(await res.text());
      setNewUserName('');
      setNewUserEmail('');
      await fetchUsers();
    } catch (err) {
      alert("Failed to create user: " + err.message);
    } finally {
      setIsUsersLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex flex-col items-center py-12 px-6 text-slate-100 font-sans selection:bg-indigo-500/30">
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-[40%] -left-[20%] w-[70%] h-[70%] rounded-full bg-indigo-600/20 blur-[120px] mix-blend-screen"></div>
        <div className="absolute top-[60%] -right-[10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[100px] mix-blend-screen"></div>
      </div>

      <div className="relative z-10 w-full max-w-2xl space-y-8">
        <div className="text-center space-y-2 animate-fade-in-down">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">
            Caatch
          </h1>
          <p className="text-slate-400 text-lg font-medium">FastAPI + Next.js + PostgreSQL</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl space-y-8 transition-all hover:border-white/20">
          
          {/* Health Section */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">System Status</h2>
              {health ? (
                <span className="flex items-center gap-2 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  {health.status} ({health.service})
                </span>
              ) : error ? (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                  Offline
                </span>
              ) : (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Checking...
                </span>
              )}
            </div>
            {error && <p className="text-sm text-red-400 bg-red-500/10 p-3 rounded-xl border border-red-500/20">{error}</p>}
          </section>

          <hr className="border-white/5" />

          {/* Interaction Section */}
          <section className="space-y-5">
            <h2 className="text-xl font-semibold text-slate-200">Say Hello</h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all shadow-inner"
              />
              <button 
                onClick={handleGreet} 
                disabled={isLoading}
                className="group relative inline-flex items-center justify-center px-6 py-3 font-semibold text-white transition-all duration-200 bg-indigo-600 border border-transparent rounded-xl hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 focus:ring-offset-slate-900 disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_0_20px_-5px_rgba(79,70,229,0.5)]"
              >
                {isLoading ? 'Connecting...' : 'Greet Backend'}
              </button>
            </div>
            
            {/* Greeting Result */}
            <div className={`overflow-hidden transition-all duration-500 ease-in-out ${greeting ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0'}`}>
              {greeting && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-500/20 to-blue-500/20 border border-indigo-500/30">
                  <p className="text-lg font-medium text-indigo-100 text-center">{greeting}</p>
                </div>
              )}
            </div>
          </section>

          <hr className="border-white/5" />

          {/* Users Database Section */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-200">Database Users</h2>
              <span className="text-xs font-medium px-2 py-1 bg-slate-800 text-slate-400 rounded-lg border border-slate-700">
                {users.length} Total
              </span>
            </div>

            <form onSubmit={handleCreateUser} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="Name"
                required
                className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all shadow-inner"
              />
              <input
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="Email"
                required
                className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all shadow-inner"
              />
              <button 
                type="submit"
                disabled={isUsersLoading}
                className="inline-flex items-center justify-center px-6 py-3 font-semibold text-emerald-100 transition-all duration-200 bg-emerald-600/80 border border-emerald-500/50 rounded-xl hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-600 focus:ring-offset-slate-900 disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_0_20px_-5px_rgba(16,185,129,0.4)]"
              >
                {isUsersLoading ? 'Adding...' : 'Add User'}
              </button>
            </form>

            <div className="bg-black/20 border border-white/5 rounded-2xl overflow-hidden">
              {users.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-sm">No users found. Create one above!</div>
              ) : (
                <ul className="divide-y divide-white/5 max-h-60 overflow-y-auto">
                  {users.map((user, i) => (
                    <li key={i} className="p-4 hover:bg-white/5 transition-colors flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-200">{user.name}</span>
                        <span className="text-sm text-slate-400">{user.email}</span>
                      </div>
                      <span className="text-xs text-slate-500 font-mono">ID: {user.id}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

          </section>

        </div>
      </div>
    </main>
  );
}
