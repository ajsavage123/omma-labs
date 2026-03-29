import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Activity, Settings, Save } from 'lucide-react';
import { Link } from 'react-router-dom';
import layoutImg from '@/assets/office/layout.png';
import { PixelHuman, PixelHumanTyping } from '@/components/PixelHuman';

interface OfficeUser {
  id: string;
  name: string;
  role: string;
  x: number;
  y: number;
  status: 'online' | 'busy' | 'away';
  statusColor: string;
  type: 'standing' | 'typing' | 'default';
  shirtColor: string;
  hairColor: string;
  hairStyle: 'short' | 'long' | 'spiky' | 'bob';
}

const INITIAL_USERS: OfficeUser[] = [
  { id: '1', name: 'Yashoda', role: 'Engineering Group',    x: 43, y: 58, status: 'online', statusColor: '#22c55e', type: 'default',  shirtColor: '#6366F1', hairColor: '#1e1b4b', hairStyle: 'long' },
  { id: '2', name: 'Alex',    role: 'Engineering Group',    x: 56, y: 58, status: 'busy',   statusColor: '#ef4444', type: 'typing',   shirtColor: '#3B82F6', hairColor: '#1f2937', hairStyle: 'short' },
  { id: '3', name: 'Sam',     role: 'Design Studio',        x: 20, y: 40, status: 'online', statusColor: '#22c55e', type: 'typing',   shirtColor: '#10B981', hairColor: '#78350f', hairStyle: 'bob' },
  { id: '4', name: 'Jordan',  role: 'Innovation Lab',       x: 80, y: 40, status: 'away',   statusColor: '#eab308', type: 'standing', shirtColor: '#8B5CF6', hairColor: '#292524', hairStyle: 'spiky' },
  { id: '5', name: 'Taylor',  role: 'Management Suite',     x: 50, y: 22, status: 'online', statusColor: '#22c55e', type: 'standing', shirtColor: '#F59E0B', hairColor: '#3D2B1F', hairStyle: 'bob' },
];

export default function LiveOfficePage() {
  const [users, setUsers] = useState<OfficeUser[]>(() => {
    const saved = localStorage.getItem('omma-office-positions');
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });
  
  const [activeUser, setActiveUser] = useState<OfficeUser | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [typingFrame, setTypingFrame] = useState(0);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => setTypingFrame(f => (f + 1) % 2), 250);
    return () => clearInterval(t);
  }, []);

  const codeSnippets = ['</>','{ }','[ ]'];
  const [codeIdx, setCodeIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setCodeIdx(i => (i + 1) % 3), 400);
    return () => clearInterval(t);
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isEditing || !draggingId || !mapRef.current) return;
    
    const rect = mapRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setUsers(prev => prev.map(u => 
      u.id === draggingId ? { ...u, x, y } : u
    ));
  };

  const handleSave = () => {
    localStorage.setItem('omma-office-positions', JSON.stringify(users));
    setIsEditing(false);
  };

  const resetPositions = () => {
    if(confirm('Reset all positions to default?')) {
      setUsers(INITIAL_USERS);
      localStorage.removeItem('omma-office-positions');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1c] text-white flex flex-col font-sans" onMouseMove={handleMouseMove} onMouseUp={() => setDraggingId(null)}>

      {/* ── Header ─────────────────────────────────────── */}
      <header className="px-8 py-5 border-b border-white/5 flex items-center justify-between bg-[#0a0f1c]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <Link to="/" className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all group">
            <ChevronLeft className="h-5 w-5 text-gray-400 group-hover:text-white" />
          </Link>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
              <Activity className="h-6 w-6 text-indigo-400" />
              Virtual HQ
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-widest">
                Beta
              </span>
            </h1>
            <p className="text-sm text-gray-400 font-medium">Live Pixel Office Map (Prototype)</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-sm transition-all ${
              isEditing ? 'bg-green-600 hover:bg-green-500 text-white shadow-[0_0_20px_rgba(34,197,94,0.3)]' : 'bg-white/5 hover:bg-white/10 text-gray-400'
            }`}
          >
            {isEditing ? <Save className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
            {isEditing ? 'Save Perfection' : 'Adjust Seats'}
          </button>
          
          {isEditing && (
             <button onClick={resetPositions} className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl font-bold text-sm">
               Reset
             </button>
          )}

          <div className="px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
            </div>
            <span className="text-sm font-bold text-green-400">{users.length} Online Now</span>
          </div>
        </div>
      </header>

      {/* ── Map ────────────────────────────────────────── */}
      <main className="flex-1 p-6 flex items-center justify-center overflow-hidden relative">

        <div 
          ref={mapRef}
          className={`relative w-full max-w-6xl aspect-video rounded-3xl shadow-[0_0_120px_rgba(0,0,0,0.9)] border border-white/10 overflow-hidden ${isEditing ? 'cursor-crosshair ring-2 ring-indigo-500/50' : ''}`}
        >
          {/* Background pixel art */}
          <img
            src={layoutImg}
            alt="Pixel Office Layout"
            className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
            style={{ imageRendering: 'pixelated' }}
          />

          {/* Room labels */}
          {[
            { label: 'Management Suite', x: '50%', y: '10%' },
            { label: 'Engineering Floor', x: '50%', y: '48%' },
            { label: 'Design Studio',     x: '13%', y: '28%' },
            { label: 'Innovation Lab',    x: '87%', y: '28%' },
          ].map(room => (
            <div
              key={room.label}
              className="absolute -translate-x-1/2 flex items-center gap-1.5 px-2 py-1 bg-black/40 backdrop-blur-sm rounded-lg border border-white/10 text-white/40 text-[9px] font-bold uppercase tracking-widest pointer-events-none"
              style={{ left: room.x, top: room.y }}
            >
              {room.label}
            </div>
          ))}

          {/* ── Pixel Humans ─────────────────────────── */}
          {users.map(user => (
            <div
              key={user.id}
              className={`absolute transition-all duration-200 ${isEditing ? 'cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-white/20 rounded-lg p-1' : 'hover:scale-110'} z-20 group`}
              style={{ 
                left: `${user.x}%`, 
                top: `${user.y}%`, 
                transform: 'translate(-50%, -100%)',
                transition: draggingId === user.id ? 'none' : 'all 0.2s',
              }}
              onMouseDown={() => isEditing && setDraggingId(user.id)}
              onMouseEnter={() => !isEditing && setActiveUser(user)}
              onMouseLeave={() => !isEditing && setActiveUser(null)}
            >
              <div className="relative flex flex-col items-center">
                {user.type === 'typing' ? (
                  <PixelHumanTyping
                    shirtColor={user.shirtColor}
                    hairColor={user.hairColor}
                    hairStyle={user.hairStyle}
                    frame={typingFrame}
                    scale={4}
                  />
                ) : (
                  <PixelHuman
                    shirtColor={user.shirtColor}
                    hairColor={user.hairColor}
                    hairStyle={user.hairStyle}
                    scale={4}
                    isSitting={user.type === 'default'}
                    isFacingAway={user.type === 'default'}
                  />
                )}

                {user.type === 'typing' && (
                  <div className="absolute -top-4 -right-6 font-mono text-[9px] font-black px-1 py-0.5 rounded-md bg-black/80 border border-green-500/40 text-green-400">
                    {codeSnippets[codeIdx]}
                  </div>
                )}

                <div
                  className="w-2.5 h-2.5 rounded-full border-2 border-[#0a0f1c] mt-0.5 shadow-lg"
                  style={{ backgroundColor: user.statusColor, boxShadow: `0 0 8px ${user.statusColor}` }}
                />

                {!isEditing && (
                  <div className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/90 backdrop-blur border border-white/10 px-2 py-1 rounded-lg text-center whitespace-nowrap shadow-xl">
                    <p className="text-[10px] font-bold text-white leading-none">{user.name}</p>
                    <p className="text-[8px] text-gray-400 uppercase tracking-wider mt-0.5">{user.role}</p>
                  </div>
                )}
                
                {isEditing && (
                  <div className="mt-1 bg-indigo-500 text-white text-[8px] font-bold uppercase px-1.5 py-0.5 rounded animate-pulse">
                    Drag Me
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer className="h-20 border-t border-white/5 bg-[#111827]/60 backdrop-blur-xl flex items-center justify-center px-8">
        {isEditing ? (
          <div className="flex items-center gap-3 text-indigo-400 font-bold">
            <Activity className="w-5 h-5 animate-spin" />
            <p className="text-sm uppercase tracking-widest">Alignment Mode: Position staff on their chairs perfectly.</p>
          </div>
        ) : activeUser ? (
          <div className="flex items-center gap-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: activeUser.statusColor, boxShadow: `0 0 12px ${activeUser.statusColor}` }} />
            <div>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Viewing</p>
              <p className="text-lg font-black text-white">{activeUser.name} <span className="text-indigo-400 mx-2">•</span> {activeUser.role}</p>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 font-medium text-sm tracking-wide">Enter "Adjust Seats" to move your team around the map.</p>
        )}
      </footer>
    </div>
  );
}
