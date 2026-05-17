import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient'
import { MessageSquare, Database, Settings, Send, Users, Sliders, TrendingUp, ImageIcon, X, CloudOff, Briefcase, ChevronRight, HelpCircle, Award, Activity, Search, Trash2, ChevronDown } from 'lucide-react'
import { GoogleGenerativeAI } from '@google/generative-ai'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// ==========================================
// CERVELLO IA: FM26 ADVANCED TACTICAL SOLVER
// ==========================================
const FM26_CORE_ENGINE = `
SEI UN'INTELLIGENZA ARTIFICIALE SUPER-SPECIALIZZATA NEL MATCH ENGINE DI FOOTBALL MANAGER 2026.
ABBANONA QUALSIASI ROLEPLAY UMANO (niente battute, niente "Mister", niente carattere "sanguigno" o "cinico").
Sei un analista dati puro, freddo, logico e algoritmico. Il tuo unico scopo è l'ottimizzazione tattica e gestionale in FM26.

REGOLE TASSATIVE:
1. Usa SEMPRE l'italiano per la spiegazione logica, ma usa ESCLUSIVAMENTE l'inglese ufficiale di FM26 per i nomi di Ruoli (Roles), Compiti (Duties) e Istruzioni (Instructions).
2. Evidenzia SEMPRE i termini tecnici in **grassetto** (es. **Box To Box Midfielder** su **Support**).
3. In FM26 la tattica è divisa in "In Possession" e "Out of Possession". Le tue analisi tattiche devono sempre riflettere questo doppio schieramento, valutando come la squadra transita da una fase all'altra.
4. Non dare consigli generici (es. "dobbiamo attaccare di più"). Dammi l'azione meccanica esatta da fare nel gioco (es. "Alza la **Line of Engagement** su **High** e imposta **Counter-Press**").
5. Sii chirurgico e conciso. Struttura le risposte in elenchi puntati chiari.
`;

const TACTIC_JSON_INSTRUCTION = `
\n\nQUANDO DESCRIVI O CONSIGLI UNA TATTICA, DEVI ASSOLUTAMENTE AGGIUNGERE ALLA FINE DEL MESSAGGIO UN BLOCCO JSON ESATTO COME QUESTO (I ruoli devono essere in inglese):
\`\`\`json
{
  "tattica_fm": true,
  "in_possesso": ["Shorter Passing", "Higher Tempo", "Play Out Of Defence"],
  "in_transizione": ["Counter-Press", "Counter", "Distribute To Centre-Backs"],
  "non_in_possesso": ["High Press", "High Defensive Line", "Step Up More"],
  "formazione_in_possesso": [
    { "pos": "GK", "role": "Sweeper Keeper", "duty": "Defend", "name": "Cognome" },
    { "pos": "DCR", "role": "Ball Playing Defender", "duty": "Defend", "name": "Cognome" },
    { "pos": "DCL", "role": "Central Defender", "duty": "Defend", "name": "Cognome" },
    { "pos": "DM", "role": "Inverted Wing-Back", "duty": "Support", "name": "Terzino Destro Accentrato" },
    { "pos": "AML", "role": "Winger", "duty": "Attack", "name": "Cognome" },
    { "pos": "ST", "role": "Advanced Forward", "duty": "Attack", "name": "Cognome" }
  ],
  "formazione_non_in_possesso": [
    { "pos": "GK", "role": "Sweeper Keeper", "duty": "Defend", "name": "Cognome" },
    { "pos": "DCR", "role": "Ball Playing Defender", "duty": "Defend", "name": "Cognome" },
    { "pos": "DCL", "role": "Central Defender", "duty": "Defend", "name": "Cognome" },
    { "pos": "DR", "role": "Inverted Wing-Back", "duty": "Support", "name": "Terzino Destro Accentrato" },
    { "pos": "ML", "role": "Winger", "duty": "Attack", "name": "Cognome" },
    { "pos": "ST", "role": "Advanced Forward", "duty": "Attack", "name": "Cognome" }
  ]
}
\`\`\`
NOTA BENE: DEVI compilare ENTRAMBI gli array (formazione_in_possesso e formazione_non_in_possesso) con gli 11 giocatori. Usa SOLO codici posizioni esatti di FM (GK, DL, DCL, DC, DCR, DR, WBL, WBR, DM, DML, DMR, ML, MCL, MC, MCR, MR, AML, AMC, AMR, STL, ST, STR).`;

const TacticBoard = ({ data }) => {
  const [phase, setPhase] = useState('in'); 
  if (!data) return null;

  const currentFormazione = phase === 'in' ? (data.formazione_in_possesso || data.formazione || []) : (data.formazione_non_in_possesso || data.formazione || []);

  const POS_MAP = {
    'GK': { top: '88%', left: '50%' },
    'DL': { top: '72%', left: '15%' }, 'DCL': { top: '72%', left: '35%' }, 'DC': { top: '72%', left: '50%' }, 'DCR': { top: '72%', left: '65%' }, 'DR': { top: '72%', left: '85%' },
    'WBL': { top: '60%', left: '12%' }, 'WBR': { top: '60%', left: '88%' },
    'DM': { top: '55%', left: '50%' }, 'DML': { top: '55%', left: '35%' }, 'DMR': { top: '55%', left: '65%' },
    'ML': { top: '40%', left: '15%' }, 'MCL': { top: '40%', left: '35%' }, 'MC': { top: '40%', left: '50%' }, 'MCR': { top: '40%', left: '65%' }, 'MR': { top: '40%', left: '85%' },
    'AML': { top: '25%', left: '20%' }, 'AMC': { top: '25%', left: '50%' }, 'AMR': { top: '25%', left: '80%' },
    'STL': { top: '10%', left: '35%' }, 'ST': { top: '10%', left: '50%' }, 'STR': { top: '10%', left: '65%' },
  };

  return (
    <div style={{ marginTop: '20px', backgroundColor: '#0f0c1b', border: '2px solid #22d3ee', borderRadius: '12px', padding: '16px' }}>
      <h3 style={{ color: '#22d3ee', marginTop: 0, textAlign: 'center', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>⚽ FM26 Tactical Analysis</h3>
      
      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '16px' }}>
        <button onClick={() => setPhase('in')} style={{ backgroundColor: phase === 'in' ? '#34d399' : '#140f24', color: phase === 'in' ? '#000' : '#fff', border: '1px solid #34d399', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' }}>🟢 In Possession</button>
        <button onClick={() => setPhase('out')} style={{ backgroundColor: phase === 'out' ? '#ef4444' : '#140f24', color: phase === 'out' ? '#fff' : '#fff', border: '1px solid #ef4444', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' }}>🔴 Out of Possession</button>
      </div>

      <div style={{ display: 'flex', flexDirection: window.innerWidth <= 768 ? 'column' : 'row', gap: '10px', marginBottom: '20px', fontSize: '12px' }}>
        <div style={{ flex: 1, backgroundColor: '#140f24', padding: '10px', borderRadius: '6px', borderLeft: '3px solid #34d399' }}>
          <strong style={{ color: '#34d399', textTransform: 'uppercase' }}>In Possession</strong>
          <ul style={{ margin: '4px 0 0 0', paddingLeft: '16px', color: '#cbd5e1' }}>{data.in_possesso?.map((i, x) => <li key={x}>{i}</li>)}</ul>
        </div>
        <div style={{ flex: 1, backgroundColor: '#140f24', padding: '10px', borderRadius: '6px', borderLeft: '3px solid #fbbf24' }}>
          <strong style={{ color: '#fbbf24', textTransform: 'uppercase' }}>In Transition</strong>
          <ul style={{ margin: '4px 0 0 0', paddingLeft: '16px', color: '#cbd5e1' }}>{data.in_transizione?.map((i, x) => <li key={x}>{i}</li>)}</ul>
        </div>
        <div style={{ flex: 1, backgroundColor: '#140f24', padding: '10px', borderRadius: '6px', borderLeft: '3px solid #ef4444' }}>
          <strong style={{ color: '#ef4444', textTransform: 'uppercase' }}>Out of Possession</strong>
          <ul style={{ margin: '4px 0 0 0', paddingLeft: '16px', color: '#cbd5e1' }}>{data.non_in_possesso?.map((i, x) => <li key={x}>{i}</li>)}</ul>
        </div>
      </div>

      <div style={{ position: 'relative', width: '100%', maxWidth: '380px', height: '480px', backgroundColor: '#10b981', margin: '0 auto', borderRadius: '8px', border: '2px solid #fff', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '2px', backgroundColor: 'rgba(255,255,255,0.4)' }}></div>
        <div style={{ position: 'absolute', top: '50%', left: '50%', width: '100px', height: '100px', border: '2px solid rgba(255,255,255,0.4)', borderRadius: '50%', transform: 'translate(-50%, -50%)' }}></div>
        <div style={{ position: 'absolute', bottom: '-2px', left: '50%', width: '180px', height: '80px', border: '2px solid rgba(255,255,255,0.4)', transform: 'translateX(-50%)' }}></div>
        <div style={{ position: 'absolute', bottom: '-2px', left: '50%', width: '80px', height: '40px', border: '2px solid rgba(255,255,255,0.4)', transform: 'translateX(-50%)' }}></div>
        <div style={{ position: 'absolute', top: '-2px', left: '50%', width: '180px', height: '80px', border: '2px solid rgba(255,255,255,0.4)', transform: 'translateX(-50%)' }}></div>
        <div style={{ position: 'absolute', top: '-2px', left: '50%', width: '80px', height: '40px', border: '2px solid rgba(255,255,255,0.4)', transform: 'translateX(-50%)' }}></div>

        {currentFormazione.map((p, idx) => {
          const pos = POS_MAP[p.pos] || { top: '50%', left: '50%' };
          return (
            <div key={`${phase}-${idx}`} style={{ position: 'absolute', top: pos.top, left: pos.left, transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '85px', zIndex: 10, transition: 'all 0.5s ease-in-out' }}>
              <div style={{ width: '24px', height: '24px', backgroundColor: '#da1b60', borderRadius: '50%', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '10px', fontWeight: '900', boxShadow: '0 4px 6px rgba(0,0,0,0.5)' }}>{p.pos}</div>
              <div style={{ backgroundColor: 'rgba(0,0,0,0.85)', color: '#fff', fontSize: '9.5px', padding: '3px 5px', borderRadius: '4px', marginTop: '3px', textAlign: 'center', whiteSpace: 'nowrap', fontWeight: 'bold' }}>{p.name}</div>
              <div style={{ color: '#fff', fontSize: '8.5px', textAlign: 'center', textShadow: '1px 1px 2px #000', lineHeight: '1.2', marginTop: '2px', wordWrap: 'break-word', width: '100%', padding: '0 2px' }}>{p.role}</div>
              <div style={{ color: '#fbbf24', fontSize: '8.5px', textAlign: 'center', fontWeight: '900', textShadow: '1px 1px 2px #000' }}>({p.duty})</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

function App() {
  const [activeRoom, setActiveRoom] = useState('board') 
  const [dbSubTab, setDbSubTab] = useState('first_team') 
  const [sortField, setSortField] = useState('name')
  const [sortDirection, setSortDirection] = useState('asc')
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  const [mobileViewTab, setMobileViewTab] = useState('chat')
  const [showScrollBottom, setShowScrollBottom] = useState(false)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const [clubName, setClubName] = useState(() => localStorage.getItem('hq_club_name') || 'Sora')
  const [players, setPlayers] = useState(() => { try { return JSON.parse(localStorage.getItem('hq_players')) || []; } catch(e) { return []; } })
  const [shortlist, setShortlist] = useState(() => { try { return JSON.parse(localStorage.getItem('hq_shortlist')) || []; } catch(e) { return []; } })
  const [matches, setMatches] = useState(() => { try { return JSON.parse(localStorage.getItem('hq_matches')) || []; } catch(e) { return []; } })
  const [messages, setMessages] = useState(() => { try { return JSON.parse(localStorage.getItem('hq_messages')) || [{ sender_role: 'system', content: 'SYSTEM: FM26 Advanced Solver inizializzato. Pronto per analisi dati.' }]; } catch(e) { return [{ sender_role: 'system', content: 'System online.' }]; } })
  const [tacticReports, setTacticReports] = useState(() => { try { return JSON.parse(localStorage.getItem('hq_tactic_reports')) || []; } catch(e) { return []; } })
  const [finances, setFinances] = useState(() => { try { return JSON.parse(localStorage.getItem('hq_finances')) || { balance: 2500000, transfer_budget: 800000, wage_budget: 15000 }; } catch(e) { return { balance: 2500000, transfer_budget: 800000, wage_budget: 15000 }; } })

  const [personality, setPersonality] = useState(() => localStorage.getItem('hq_coach_personality') || 'professional')
  const [pressStyle, setPressStyle] = useState(() => localStorage.getItem('hq_press_style') || 'diplomatic')
  const [squadShield, setSquadShield] = useState(() => localStorage.getItem('hq_squad_shield') || 'shield_total')
  const [rivalRelation, setRivalRelation] = useState(() => localStorage.getItem('hq_rival_relation') || 'respectful')
  const [tacticalFocus, setTacticalFocus] = useState(() => localStorage.getItem('hq_tactical_focus') || 'pragmatic')

  const [simCost, setSimCost] = useState('500000')
  const [simWage, setSimWage] = useState('2000')
  const [simYears, setSimYears] = useState('3')
  const [simResult, setSimResult] = useState(null)
  
  const [externalTacticInput, setExternalTacticInput] = useState('')
  const [dsTacticInput, setDsTacticInput] = useState('')
  
  const [selectedProfile, setSelectedProfile] = useState(null) 
  const [selectedTacticReport, setSelectedTacticReport] = useState(null)
  const [editingNotes, setEditingNotes] = useState('')
  const [isSavingNotes, setIsSavingNotes] = useState(false)
  
  const [isUploading, setIsUploading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [cloudStatus, setCloudStatus] = useState('online') 

  const fileInputRef = useRef(null)
  const pressInputRef = useRef(null)
  const youthInputRef = useRef(null)
  const financeInputRef = useRef(null)
  const analystInputRef = useRef(null)
  const scoutInputRef = useRef(null)
  const vicePreMatchRef = useRef(null)
  const viceTacticInputRef = useRef(null)
  const chatImageInputRef = useRef(null) 
  const chatContainerRef = useRef(null)

  useEffect(() => { localStorage.setItem('hq_players', JSON.stringify(players)) }, [players])
  useEffect(() => { localStorage.setItem('hq_shortlist', JSON.stringify(shortlist)) }, [shortlist])
  useEffect(() => { localStorage.setItem('hq_matches', JSON.stringify(matches)) }, [matches])
  useEffect(() => { localStorage.setItem('hq_tactic_reports', JSON.stringify(tacticReports)) }, [tacticReports])
  useEffect(() => { localStorage.setItem('hq_messages', JSON.stringify(messages)) }, [messages])
  useEffect(() => { localStorage.setItem('hq_finances', JSON.stringify(finances)) }, [finances])
  useEffect(() => { localStorage.setItem('hq_coach_personality', personality) }, [personality])
  useEffect(() => { localStorage.setItem('hq_press_style', pressStyle) }, [pressStyle])
  useEffect(() => { localStorage.setItem('hq_squad_shield', squadShield) }, [squadShield])
  useEffect(() => { localStorage.setItem('hq_rival_relation', rivalRelation) }, [rivalRelation])
  useEffect(() => { localStorage.setItem('hq_tactical_focus', tacticalFocus) }, [tacticalFocus])
  useEffect(() => { localStorage.setItem('hq_club_name', clubName) }, [clubName])

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isTyping])

  useEffect(() => {
    fetchCloudData();
  }, []);

  const normalizeName = (name) => {
    if (!name) return '';
    return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  };

  const handleChatScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    if (scrollHeight - scrollTop - clientHeight > 100) { setShowScrollBottom(true); } else { setShowScrollBottom(false); }
  };

  const scrollToBottom = () => {
    if (chatContainerRef.current) { chatContainerRef.current.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' }); }
  };

  const formatMessageContent = (text) => {
    if (!text) return null;
    let displayString = text;
    let tacticData = null;
    
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/i) || text.match(/```json([\s\S]*?)```/i);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.tattica_fm) {
          tacticData = parsed;
          displayString = text.replace(jsonMatch[0], '').trim();
        }
      } catch(e) {}
    }

    const lines = displayString.split('\n').map((line, index) => {
      let isList = line.trim().startsWith('* ');
      let isHeader = line.trim().startsWith('### ');
      let isSubHeader = line.trim().startsWith('## ');
      
      let cleanLine = line;
      if (isList) cleanLine = line.replace('* ', '').trim();
      if (isHeader) cleanLine = line.replace('### ', '').trim();
      if (isSubHeader) cleanLine = line.replace('## ', '').trim();
      
      const parts = cleanLine.split(/(\*\*.*?\*\*)/g);
      const renderedParts = parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) { return <strong key={i} style={{ color: '#22d3ee', fontWeight: '900' }}>{part.slice(2, -2)}</strong>; }
        return <span key={i}>{part}</span>;
      });

      if (isHeader || isSubHeader) return <div key={index} style={{ marginTop: '14px', marginBottom: '8px', fontSize: '1.1em', fontWeight: '900', color: '#a855f7', borderBottom: '1px solid #231b3a', paddingBottom: '4px' }}>{renderedParts}</div>;
      if (isList) return <div key={index} style={{ display: 'flex', gap: '8px', marginTop: '6px', paddingLeft: '12px' }}><span style={{ color: '#da1b60', fontWeight: 'bold' }}>•</span><div style={{ flex: 1 }}>{renderedParts}</div></div>;
      return <div key={index} style={{ marginTop: '4px', minHeight: '14px' }}>{renderedParts}</div>;
    });

    return <div>{lines}{tacticData && <TacticBoard data={tacticData} />}</div>;
  };

  const fetchCloudData = async () => {
    try {
      let { data: pData } = await supabase.from('players').select('*').order('name')
      if (pData && pData.length > 0) setPlayers(pData)
      let { data: sData } = await supabase.from('shortlist').select('*').order('created_at', { ascending: false })
      if (sData && sData.length > 0) setShortlist(sData)
      let { data: mLog } = await supabase.from('matches').select('*').order('created_at', { ascending: false })
      if (mLog && mLog.length > 0) setMatches(mLog)
      let { data: fData } = await supabase.from('club_finances').select('*').eq('id', 1).single()
      if (fData) setFinances({ balance: fData.balance, transfer_budget: fData.transfer_budget, wage_budget: fData.wage_budget })
      let { data: mData } = await supabase.from('club_messages').select('*').order('created_at', { ascending: true })
      if (mData && mData.length > 0) setMessages(mData)
      setCloudStatus('online')
    } catch (err) { setCloudStatus('offline') }
  };

  const updateFinancesCloud = async (field, value) => {
    const numValue = parseFloat(value) || 0;
    const updatedFinances = { ...finances, [field]: numValue };
    setFinances(updatedFinances);
    try { await supabase.from('club_finances').update({ [field]: numValue }).eq('id', 1); } catch (e) { setCloudStatus('offline') }
  };

  const handleForceSync = async () => {
    try {
      const safePlayers = Array.isArray(players) ? players : [];
      if (safePlayers.length === 0) { alert("Nessun giocatore in memoria sul PC da inviare al cloud."); return; }
      setIsUploading(true);
      for (const p of safePlayers) {
        const toInsert = { name: p.name || 'Sconosciuto', age: parseInt(p.age) ? parseInt(p.age) : null, position: p.position || 'N/D', type: p.type || 'player', attributes: p.attributes || {}, notes: p.notes || '' };
        let { data: existing } = await supabase.from('players').select('*');
        const match = (existing || []).find(x => normalizeName(x.name) === normalizeName(p.name));
        if (match) { await supabase.from('players').update(toInsert).eq('id', match.id); } 
        else { await supabase.from('players').insert([toInsert]); }
      }
      alert("✅ Sincronizzazione Cloud completata!");
    } catch (e) { alert("Errore durante la sincronizzazione."); } finally { setIsUploading(false); }
  };

  const handleClearAllData = async () => {
    if (window.confirm("Vuoi azzerare la sede societaria e ricominciare da zero?")) {
      setPlayers([]); setShortlist([]); setMatches([]); setTacticReports([]);
      setMessages([{ sender_role: 'system', content: 'Database azzerato. Sistema riavviato.' }]);
      setFinances({ balance: 2500000, transfer_budget: 800000, wage_budget: 15000 }); 
      setSelectedProfile(null); localStorage.clear();
      try { await supabase.from('players').delete().neq('id', 0); await supabase.from('shortlist').delete().neq('id', 0); await supabase.from('matches').delete().neq('id', 0); await supabase.from('club_messages').delete().neq('id', 0); } catch(e) {}
    }
  };

  const handleSidebarClick = (room) => { setActiveRoom(room); setMobileViewTab('chat'); };
  
  const handleSelectPlayer = (player, event) => {
    if (event.target.closest('button')) return; 
    if (!player) return;
    setSelectedProfile(player); setEditingNotes(player.notes || '');
  };

  const handleDeletePlayer = async (id) => {
    if (window.confirm("Eliminare definitivamente il giocatore dall'archivio?")) {
      setPlayers(prev => prev.filter(p => p.id !== id));
      try { await supabase.from('players').delete().eq('id', id); } catch(e) {}
      if (selectedProfile && selectedProfile.id === id) setSelectedProfile(null);
    }
  };

  const handleSavePlayerNotes = async () => {
    if (!selectedProfile) return; setIsSavingNotes(true);
    try {
      const updatedPlayers = players.map(p => p.id === selectedProfile.id ? { ...p, notes: editingNotes } : p);
      setPlayers(updatedPlayers); setSelectedProfile(prev => ({ ...prev, notes: editingNotes }));
      await supabase.from('players').update({ notes: editingNotes }).eq('id', selectedProfile.id);
      const systemNote = { sender_role: 'system', content: `📝 Fascicolo aggiornato per ${selectedProfile.name}: "${editingNotes}"` };
      setMessages(prev => [...prev, systemNote]);
      try { await supabase.from('club_messages').insert([systemNote]); } catch(e) {}
    } catch (e) { console.error(e); } finally { setIsSavingNotes(false); }
  };

  const handleRemoveFromShortlist = async (id) => {
    setShortlist(prev => prev.filter(s => s.id !== id));
    try { await supabase.from('shortlist').delete().eq('id', id); } catch(e) {}
  };

  const handleSimulateTransfer = () => {
    const cost = parseFloat(simCost) || 0; const weeklyWage = parseFloat(simWage) || 0; const years = parseInt(simYears) || 1;
    const annualAmortization = cost / years; const annualWageCost = weeklyWage * 52; const totalAnnualImpact = annualAmortization + annualWageCost;
    let status = 'APPROVATO'; let color = '#34d399'; let notes = `Operazione sostenibile. Impatto annuo: €${totalAnnualImpact.toLocaleString()}.`;
    if (cost > finances.transfer_budget) { status = 'BLOCCATO'; color = '#ef4444'; notes = `Fondi insufficienti.`; }
    else if (weeklyWage > (finances.wage_budget * 0.3)) { status = 'RISCHIO SPOGLIATOIO'; color = '#ffaa00'; notes = `L'ingaggio supera il 30% del tetto salariale.`; }
    setSimResult({ status, color, annualAmortization, annualWageCost, notes });
  };

  const handleSort = (field) => {
    if (sortField === field) { setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc'); } 
    else { setSortField(field); setSortDirection('asc'); }
  };

  // CORE AI CHAT
  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    const currentInputText = chatInput; setChatInput(''); setIsTyping(true);
    const userRole = `user:${activeRoom}`; const userMessageObj = { sender_role: userRole, content: currentInputText };
    const updatedMessages = [...messages, userMessageObj]; setMessages(updatedMessages);

    try { await supabase.from('club_messages').insert([userMessageObj]); } catch(e) { setCloudStatus('offline') }

    try {
      const safePlayers = Array.isArray(players) ? players : [];
      const safeShortlist = Array.isArray(shortlist) ? shortlist : [];
      const safeMatches = Array.isArray(matches) ? matches : [];

      const squadContext = safePlayers.map(p => ({ nome: p?.name || 'Sconosciuto', ruolo: p?.position || 'N/D', stats: p?.attributes || {}, note_mister: p?.notes || '' }));
      const shortlistContext = safeShortlist.slice(0, 15).map(s => ({ nome: s?.name || 'Target', ruolo: s?.position || 'N/D', verdetto: s?.verdict || 'VAGLIATO' }));
      const matchesContext = safeMatches.slice(0, 5).map(m => ({ avversario: m?.opponent || 'Gara', risultato: m?.result || 'N/D', analisi: m?.analysis || '' }));

      const businessChronology = updatedMessages.slice(-45).map(m => {
        let roleLabel = m?.sender_role ? String(m.sender_role).toUpperCase() : 'MISTER';
        if (roleLabel.startsWith('USER:')) roleLabel = `MISTER (nella stanza ${roleLabel.split(':')[1]})`;
        return `${roleLabel}: ${m?.content || ''}`;
      }).join('\n');

      let instructionPrompt = `
        ${FM26_CORE_ENGINE}
        Input dell'utente: "${currentInputText}"
        
        CRONOLOGIA:
        ${businessChronology}
        
        SITUAZIONE:
        - Squadra: ${clubName.toUpperCase()}
        - ROSA SORA: ${JSON.stringify(squadContext.slice(0, 30))}
        - OBIETTIVI: ${JSON.stringify(shortlistContext)}
        - GARE: ${JSON.stringify(matchesContext)}
      `;

      if (activeRoom === 'board') { instructionPrompt += `\nRispondi simulando un'analisi congiunta di tutto il team dati.`; } 
      else { 
        instructionPrompt += `\nSTANZA SINGOLA ATTIVA: SEI NELL'UFFICIO '${activeRoom.toUpperCase()}'. Adatta la tua analisi FM26 alla specializzazione di questo ufficio.`; 
        if (activeRoom === 'vice') instructionPrompt += TACTIC_JSON_INSTRUCTION;
      }

      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(instructionPrompt);
      const aiMessageObj = { sender_role: activeRoom, content: result.response.text() };
      setMessages(prev => [...prev, aiMessageObj]);
      try { await supabase.from('club_messages').insert([aiMessageObj]); } catch(e) {}
    } catch (error) { console.error(error); } finally { setIsTyping(false); }
  };

  const handleChatImageUpload = async (event) => {
    const file = event.target.files[0]; 
    if (!file) return; 
    
    const currentText = chatInput.trim(); setChatInput(''); setIsTyping(true); if (isMobile) setMobileViewTab('chat');
    
    try {
      const reader = new FileReader(); 
      reader.onloadend = async () => {
        const imagePart = { inlineData: { data: reader.result.split(',')[1], mimeType: file.type } };
        
        const userRole = `user:${activeRoom}`;
        const displayMsg = currentText ? `📷 [Immagine allegata] ${currentText}` : `📷 [Immagine allegata] Analizza questo screenshot in base al tuo ruolo.`;
        
        const userMessageObj = { sender_role: userRole, content: displayMsg };
        setMessages(prev => [...prev, userMessageObj]);
        try { await supabase.from('club_messages').insert([userMessageObj]); } catch(e) {}

        const safePlayers = Array.isArray(players) ? players : [];
        const squadContext = safePlayers.map(p => ({ nome: p?.name || 'Sconosciuto', ruolo: p?.position || 'N/D', stats: p?.attributes || {} }));

        let instructionPrompt = `
          ${FM26_CORE_ENGINE}
          Input utente: "${currentText || 'Analizza questo screen.'}"
          
          Questa è un'immagine tratta da Football Manager. In base alla stanza in cui ti trovi, fai un'analisi logica e algoritmica estraendo dati dall'immagine.
          Se sei il VICE, concentrati su ruoli e tattica. Se sei lo SCOUT, sugli attributi e PA/CA. Se sei l'ANALYST sui dati xG. 
          
          ROSA: ${JSON.stringify(squadContext.slice(0, 20))}
        `;

        if (activeRoom === 'board') { instructionPrompt += `\nFai un'analisi generale.`; } 
        else { 
          instructionPrompt += `\nSei nell'ufficio '${activeRoom.toUpperCase()}'. Usa termini in INGLESE per le funzioni di FM26.`; 
          if (activeRoom === 'vice') instructionPrompt += TACTIC_JSON_INSTRUCTION;
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent([instructionPrompt, imagePart]); 
        const output = result.response.text();
        
        const aiMessageObj = { sender_role: activeRoom, content: output }; 
        setMessages(prev => [...prev, aiMessageObj]);
        try { await supabase.from('club_messages').insert([aiMessageObj]); } catch(e) {}
      }; 
      reader.readAsDataURL(file);
    } catch (err) { console.error(err); } finally { setIsTyping(false); if (chatImageInputRef.current) chatImageInputRef.current.value = ""; }
  };

  // 10. FUNZIONI MULTIMEDIALI STRUMENTI SPECIFICI
  const handlePreMatchAnalysis = async (event) => {
    const file = event.target.files[0]; if (!file) return; setIsTyping(true); if (isMobile) setMobileViewTab('chat');
    try {
      const reader = new FileReader(); reader.onloadend = async () => {
        const imagePart = { inlineData: { data: reader.result.split(',')[1], mimeType: file.type } };
        const safePlayers = Array.isArray(players) ? players : [];
        const squadContext = safePlayers.map(p => ({ nome: p?.name, ruolo: p?.position, stats: p?.attributes }));

        const prompt = `
        ${FM26_CORE_ENGINE}
        Sei il TATTICO (Vice). Questo è lo schieramento avversario. Nostra rosa: ${JSON.stringify(squadContext.slice(0, 40))}.
        Genera l'analisi tattica con Istruzioni Avversario e Tattica Nostra Ideale.
        ` + TACTIC_JSON_INSTRUCTION;

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent([prompt, imagePart]); const output = result.response.text();
        const userMsg = { sender_role: `user:vice`, content: `📷 Analisi pre-match richiesta sullo schieramento avversario.` };
        const aiMsg = { sender_role: 'vice', content: output }; setMessages(prev => [...prev, userMsg, aiMsg]);
        try { await supabase.from('club_messages').insert([userMsg, aiMsg]); } catch(e) {}
      }; reader.readAsDataURL(file);
    } catch (err) { console.error(err); } finally { setIsTyping(false); }
  };

  const handleViceImageUpload = async (event) => {
    const file = event.target.files[0]; if (!file) return; setIsTyping(true); if (isMobile) setMobileViewTab('chat');
    try {
      const reader = new FileReader(); reader.onloadend = async () => {
        const imagePart = { inlineData: { data: reader.result.split(',')[1], mimeType: file.type } };
        const prompt = `
        ${FM26_CORE_ENGINE}
        Sei il TATTICO (Vice). Analizza questa immagine con competenza pura su FM26.` + TACTIC_JSON_INSTRUCTION;
        
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent([prompt, imagePart]); const output = result.response.text();
        const userMsg = { sender_role: `user:vice`, content: `📷 Analizza questa situazione tattica/di campo.` };
        const aiMsg = { sender_role: 'vice', content: output }; setMessages(prev => [...prev, userMsg, aiMsg]);
        try { await supabase.from('club_messages').insert([userMsg, aiMsg]); } catch(e) {}
      }; reader.readAsDataURL(file);
    } catch (err) { console.error(err); } finally { setIsTyping(false); }
  };

  const handleAnalyzeExternalTactic = async () => {
    if (!externalTacticInput.trim()) return; setIsTyping(true); if (isMobile) setMobileViewTab('chat');
    const inputBuffer = externalTacticInput; setExternalTacticInput('');
    try {
      const prompt = `
      ${FM26_CORE_ENGINE}
      Analizza la tattica: """${inputBuffer}""" in base alla rosa ${clubName}. Inizia con TITOLO: [Nome breve della tattica]` + TACTIC_JSON_INSTRUCTION;
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(prompt); const outputText = result.response.text();
      const cleanTitle = (outputText.match(/TITOLO:\s*(.*)/i)?.[1] || `Tattica del ${new Date().toLocaleDateString()}`).replace('[', '').replace(']', '').trim();
      const userMsg = { sender_role: `user:vice`, content: `📋 Valuta questo setup tattico.` };
      const aiMsg = { sender_role: 'vice', content: outputText }; setMessages(prev => [...prev, userMsg, aiMsg]);
      setTacticReports(prev => [{ title: cleanTitle, content: outputText, id: Date.now() }, ...prev]);
      try { await supabase.from('club_messages').insert([userMsg, aiMsg]); } catch(e) {}
    } catch (error) { console.error(error); } finally { setIsTyping(false); }
  };

  const handleAnalyzeSquadEsuberi = async () => {
    if (!dsTacticInput.trim()) return; setIsTyping(true); if (isMobile) setMobileViewTab('chat');
    const inputBuffer = dsTacticInput; setDsTacticInput('');
    try {
      const safePlayers = Array.isArray(players) ? players : [];
      const squadContext = safePlayers.map(p => ({ nome: p?.name, ruolo: p?.position, stats: p?.attributes }));
      const prompt = `
      ${FM26_CORE_ENGINE}
      Sei il SQUAD PLANNER (DS). Tattica: "${inputBuffer}". Rosa: ${JSON.stringify(squadContext.slice(0, 40))}.
      Genera una lista tecnica di ESUBERI: giocatori da cedere perché inadatti a questa tattica valutando i loro attributi.`;
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(prompt); const outputText = result.response.text();
      const userMsg = { sender_role: `user:ds`, content: `📋 Direttore, crea lista esuberi in base alla tattica: "${inputBuffer}".` };
      const aiMsg = { sender_role: 'ds', content: outputText }; setMessages(prev => [...prev, userMsg, aiMsg]);
      try { await supabase.from('club_messages').insert([userMsg, aiMsg]); } catch(e) {}
    } catch (error) { console.error(error); } finally { setIsTyping(false); }
  };

  const handleScoutImageUpload = async (event) => {
    const file = event.target.files[0]; if (!file) return; setIsTyping(true); if (isMobile) setMobileViewTab('chat');
    try {
      const reader = new FileReader(); reader.onloadend = async () => {
        const imagePart = { inlineData: { data: reader.result.split(',')[1], mimeType: file.type } };
        const prompt = `
        ${FM26_CORE_ENGINE}
        Sei il DATA SCOUT. Schedatura FM26. Output: VERDETTO: [ACQUISTARE, RISERVA, EVITARE] NOME: [Nome] RUOLO: [Ruolo] REPORT: [Analisi dati attributi CA/PA]`;
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent([prompt, imagePart]); const output = result.response.text();
        const pName = (output.match(/NOME:\s*(.*)/i)?.[1] || 'Obiettivo Scansionato').trim();
        const pRole = (output.match(/RUOLO:\s*(.*)/i)?.[1] || 'N/D').trim();
        const pVerdict = (output.match(/VERDETTO:\s*(.*)/i)?.[1] || 'VALUTATO').trim();
        const userMsg = { sender_role: `user:scout`, content: `📷 Scansione profilo giocatore.` };
        const aiMsg = { sender_role: 'scout', content: output }; setMessages(prev => [...prev, userMsg, aiMsg]);
        try { 
          const targetShortlist = { name: pName, position: pRole, verdict: pVerdict, analysis: output };
          let { data } = await supabase.from('shortlist').insert([targetShortlist]).select();
          if (data && data.length > 0) setShortlist(prev => [data[0], ...prev]);
          await supabase.from('club_messages').insert([userMsg, aiMsg]); 
        } catch(e) {}
      }; reader.readAsDataURL(file);
    } catch (err) { console.error(err); } finally { setIsTyping(false); }
  };

  const handlePressImageUpload = async (event) => {
    const file = event.target.files[0]; if (!file) return; setIsTyping(true); if (isMobile) setMobileViewTab('chat');
    try {
      const reader = new FileReader(); reader.onloadend = async () => {
        const imagePart = { inlineData: { data: reader.result.split(',')[1], mimeType: file.type } };
        const prompt = `
        ${FM26_CORE_ENGINE}
        Sei l'Addetto Stampa. Analizza la conferenza FM26 e suggerisci la risposta migliore per massimizzare Morale e Coesione Squadra.`;
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent([prompt, imagePart]); const output = result.response.text();
        const userMsg = { sender_role: `user:press`, content: `📷 Screen conferenza.` };
        const aiMsg = { sender_role: 'press', content: output }; setMessages(prev => [...prev, userMsg, aiMsg]);
        try { await supabase.from('club_messages').insert([userMsg, aiMsg]); } catch(e){}
      }; reader.readAsDataURL(file);
    } catch (err) { console.error(err); } finally { setIsTyping(false); }
  };

  const handleAnalystImageUpload = async (event) => {
    const file = event.target.files[0]; if (!file) return; setIsTyping(true); if (isMobile) setMobileViewTab('chat');
    try {
      const reader = new FileReader(); reader.onloadend = async () => {
        const imagePart = { inlineData: { data: reader.result.split(',')[1], mimeType: file.type } };
        const prompt = `
        ${FM26_CORE_ENGINE}
        Sei il MATCH ANALYST. Estrai dati: AVVERSARIO: [Nome] RISULTATO: [Risultato] XG_TEAM: [xG] XG_OPP: [xG] ANALISI: [Analisi dati Data Hub FM26]`;
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent([prompt, imagePart]); const output = result.response.text();
        const mOpp = (output.match(/AVVERSARIO:\s*(.*)/i)?.[1] || 'Gara').trim();
        const mRes = (output.match(/RISULTATO:\s*(.*)/i)?.[1] || 'N/D').trim();
        const mXgT = (output.match(/XG_TEAM:\s*(.*)/i)?.[1] || '-').trim();
        const mXgO = (output.match(/XG_OPP:\s*(.*)/i)?.[1] || '-').trim();
        const userMsg = { sender_role: `user:analyst`, content: `📷 Tabellino Data Hub caricato.` };
        const aiMsg = { sender_role: 'analyst', content: output }; setMessages(prev => [...prev, userMsg, aiMsg]);
        try { 
          const matchLog = { opponent: mOpp, result: mRes, xg_team: mXgT, xg_opp: mXgO, analysis: output };
          let { data } = await supabase.from('matches').insert([matchLog]).select();
          if (data && data.length > 0) setMatches(prev => [data[0], ...prev]);
          await supabase.from('club_messages').insert([userMsg, aiMsg]); 
        } catch(e) {}
      }; reader.readAsDataURL(file);
    } catch (e) { console.error(e); } finally { setIsTyping(false); }
  };

  const handleFinanceImageUpload = async (event) => {
    const file = event.target.files[0]; if (!file) return; setIsTyping(true); if (isMobile) setMobileViewTab('chat');
    try {
      const reader = new FileReader(); reader.onloadend = async () => {
        const imagePart = { inlineData: { data: reader.result.split(',')[1], mimeType: file.type } };
        const prompt = `Sei il CFO. Estrai finanze in JSON puro: { "balance": numero, "transfer_budget": numero, "wage_budget": numero, "analysis": "analisi tecnica del budget" }`;
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent([prompt, imagePart]);
        const cleanText = result.response.text().replace(/```json/gi, '').replace(/```/g, '').trim();
        try {
          const parsed = JSON.parse(cleanText);
          if (parsed) {
            setFinances({ balance: parsed.balance || 0, transfer_budget: parsed.transfer_budget || 0, wage_budget: parsed.wage_budget || 0 });
            const userMsg = { sender_role: `user:cfo`, content: `📷 Screen bilancio societario.` };
            const aiMsg = { sender_role: 'cfo', content: parsed.analysis || "Audit completato." }; setMessages(prev => [...prev, userMsg, aiMsg]);
            try { await supabase.from('club_finances').update({ balance: parsed.balance || 0, transfer_budget: parsed.transfer_budget || 0, wage_budget: parsed.wage_budget || 0 }).eq('id', 1); await supabase.from('club_messages').insert([userMsg, aiMsg]); } catch (e) {}
          }
        } catch (jsonErr) {}
      }; reader.readAsDataURL(file);
    } catch (e) { console.error(e); } finally { setIsTyping(false); }
  };

  const handleFinanceAudit = async () => {
    setIsTyping(true); if (isMobile) setMobileViewTab('chat');
    try {
      const safePlayers = Array.isArray(players) ? players : [];
      const soraPlayersContext = safePlayers.map(p => ({ nome: p?.name, stipendio: p?.attributes?.Ingaggio || '-' }));
      const prompt = `${FM26_CORE_ENGINE} CFO Club. Redigi audit Monte Ingaggi. Cassa €${finances?.balance || 0}. Contratti: ${JSON.stringify(soraPlayersContext.slice(0, 30))}`;
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(prompt); const auditOutput = result.response.text();
      const userMsg = { sender_role: `user:cfo`, content: `📊 Richiesta Audit Contabile.` };
      const aiMsg = { sender_role: 'cfo', content: auditOutput }; setMessages(prev => [...prev, userMsg, aiMsg]);
      try { await supabase.from('club_messages').insert([userMsg, aiMsg]); } catch(e) {}
    } catch (e) { console.error(e); } finally { setIsTyping(false); }
  };

  const handleYouthImageUpload = async (event) => {
    const file = event.target.files[0]; if (!file) return; setIsTyping(true); if (isMobile) setMobileViewTab('chat');
    try {
      const reader = new FileReader(); reader.onloadend = async () => {
        const imagePart = { inlineData: { data: reader.result.split(',')[1], mimeType: file.type } };
        const prompt = `${FM26_CORE_ENGINE} Sei il Resp. Giovanili. Valuta il wonderkid sui dati FM26.`;
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent([prompt, imagePart]); const output = result.response.text();
        const userMsg = { sender_role: `user:youth`, content: `📷 Valutazione giovane.` };
        const aiMsg = { sender_role: 'youth', content: output }; setMessages(prev => [...prev, userMsg, aiMsg]);
        try { await supabase.from('club_messages').insert([userMsg, aiMsg]); } catch(e){}
      }; reader.readAsDataURL(file);
    } catch (e) { console.error(e); } finally { setIsTyping(false); }
  };

  const handleImageUploadOCR = async (event) => {
    const file = event.target.files[0]; if (!file) return; setIsUploading(true); 
    try {
      const reader = new FileReader(); reader.onloadend = async () => {
        const imagePart = { inlineData: { data: reader.result.split(',')[1], mimeType: file.type } };
        const prompt = `Estrai calciatori in array JSON puro: [ { "type": "player", "name": "Nome", "age": "num", "position": "Ruolo", "attributes": { "Gol": "num", "Media Voto": "num", "Presenze": "num", "Ingaggio": "txt", "Valore": "txt" } } ]`;
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent([prompt, imagePart]);
        const cleanText = result.response.text().replace(/```json/gi, '').replace(/```/g, '').trim();
        try {
          const extractedData = JSON.parse(cleanText);
          if (Array.isArray(extractedData)) {
            const sanitizedData = extractedData.map(p => {
              const ageVal = parseInt(p?.age);
              return { name: p?.name || 'Sconosciuto', position: p?.position || 'N/D', age: isNaN(ageVal) ? null : ageVal, type: p?.type || 'player', attributes: p?.attributes || {} };
            });
            setPlayers(prev => {
              const list = Array.isArray(prev) ? [...prev] : []; 
              sanitizedData.forEach(np => {
                const idx = list.findIndex(x => normalizeName(x?.name) === normalizeName(np.name));
                if (idx >= 0) { list[idx] = { ...list[idx], ...np, attributes: { ...(list[idx]?.attributes || {}), ...(np.attributes || {}) } }; } 
                else { list.push(np); }
              }); return list;
            });
            try {
              let { data: dbPlayers } = await supabase.from('players').select('*');
              const safeDbPlayers = Array.isArray(dbPlayers) ? dbPlayers : [];
              for (const p of sanitizedData) {
                const match = safeDbPlayers.find(x => normalizeName(x?.name) === normalizeName(p.name));
                if (match) { await supabase.from('players').update({ age: p.age, position: p.position, attributes: { ...(match.attributes || {}), ...p.attributes } }).eq('id', match.id); } 
                else { await supabase.from('players').insert([p]); }
              }
            } catch(e) {}
          }
        } catch (jsonErr) {}
      }; reader.readAsDataURL(file);
    } catch (e) { console.error(e); } finally { setIsUploading(false); } 
  };

  // 11. COMPONENTI DI RENDER: FINESTRE E TABELLE
  function renderChatWindow() {
    const safeMessages = Array.isArray(messages) ? messages : [];
    const visibleMessages = safeMessages.filter(msg => {
      if (!msg || !msg.sender_role) return false;
      if (msg.sender_role === 'system') return true;
      if (activeRoom === 'board') return msg.sender_role === 'board' || msg.sender_role === 'user:board' || msg.sender_role === 'user';
      return msg.sender_role === activeRoom || msg.sender_role === `user:${activeRoom}`;
    });

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#0d0a16', width: '100%', height: '100%', position: 'relative' }}>
        <div style={{ height: '75px', padding: '0 24px', borderBottom: '2px solid #231b3a', display: 'flex', alignItems: 'center', backgroundColor: '#140f24', justifyContent: 'space-between', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <MessageSquare size={24} color="#da1b60" /> 
            <h2 style={{ fontSize: isMobile ? '16px' : '22px', color: '#ffffff', margin: 0, textTransform: 'uppercase', fontWeight: '900' }}>
              {activeRoom === 'board' ? '🏛️ PLENARIA DATI' : `💼 UFFICIO TECNICO: ${activeRoom.toUpperCase()}`}
            </h2>
          </div>
        </div>

        {isMobile && (
          <div style={{ display: 'flex', backgroundColor: '#140f24', borderBottom: '2px solid #231b3a', padding: '8px', gap: '8px' }}>
            <button onClick={() => setMobileViewTab('chat')} style={{ flex: 1, padding: '12px', fontSize: '14px', fontWeight: '900', border: 'none', borderRadius: '6px', backgroundColor: mobileViewTab === 'chat' ? '#da1b60' : '#090710', color: '#fff', textTransform: 'uppercase' }}>💬 Analisi</button>
            <button onClick={() => setMobileViewTab('tools')} style={{ flex: 1, padding: '12px', fontSize: '14px', fontWeight: '900', border: 'none', borderRadius: '6px', backgroundColor: mobileViewTab === 'tools' ? '#22d3ee' : '#090710', color: '#fff', textTransform: 'uppercase' }}>🛠️ Strumenti</button>
          </div>
        )}

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', flexDirection: isMobile ? 'column' : 'row', position: 'relative' }}>
          {(!isMobile || mobileViewTab === 'chat') && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', borderRight: isMobile ? 'none' : '2px solid #231b3a', backgroundColor: '#090710', position: 'relative' }}>
              <div ref={chatContainerRef} onScroll={handleChatScroll} style={{ flex: 1, padding: isMobile ? '16px' : '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {visibleMessages.map((msg, index) => {
                  let align = 'flex-start'; let bColor = '#2c2347'; let nameLabel = 'STAFF FM26'; let itemBg = '#140f24';
                  const role = msg?.sender_role ? String(msg.sender_role) : '';
                  if (role.startsWith('user')) { align = 'flex-end'; bColor = '#da1b60'; nameLabel = 'MISTER (OMISEREZ)'; itemBg = '#1d1433'; }
                  else if (role === 'vice') { bColor = '#22d3ee'; nameLabel = 'TATTICO SQUADRA (VICE)'; }
                  else if (role === 'ds') { bColor = '#fbbf24'; nameLabel = 'SQUAD PLANNER (DS)'; }
                  else if (role === 'scout') { bColor = '#f43f5e'; nameLabel = 'DATA SCOUT'; }
                  else if (role === 'cfo') { bColor = '#10b981'; nameLabel = 'AUDIT FINANZIARIO'; }
                  else if (role === 'press') { bColor = '#ec4899'; nameLabel = 'MEDIA MANAGER'; }
                  else if (role === 'youth') { bColor = '#ffaa00'; nameLabel = 'SVILUPPO GIOVANI'; }
                  else if (role === 'analyst') { bColor = '#3b82f6'; nameLabel = 'MATCH ANALYST'; }
                  else if (role === 'board') { bColor = '#a855f7'; nameLabel = 'BOARD DIRETTIVO'; }
                  
                  return (
                    <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: align, width: '100%' }}>
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '900', marginBottom: '6px', textTransform: 'uppercase' }}>{nameLabel}</span>
                      <div style={{ padding: '16px', fontSize: '15px', backgroundColor: itemBg, color: '#e2e8f0', borderLeft: `4px solid ${bColor}`, borderRadius: '6px', maxWidth: '85%', lineHeight: '1.6', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>
                        {formatMessageContent(msg?.content || '')}
                      </div>
                    </div>
                  );
                })}
                {isTyping && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '11px', color: '#475569', fontWeight: 'bold', marginBottom: '4px' }}>MOTORE FM26 IN ELABORAZIONE</span>
                    <div style={{ padding: '14px', fontSize: '15px', backgroundColor: '#140f24', color: '#64748b', borderLeft: '4px solid #475569', borderRadius: '6px', fontStyle: 'italic' }}>Calcolo sinergie tattiche...</div>
                  </div>
                )}
              </div>

              {showScrollBottom && (
                <button onClick={scrollToBottom} style={{ position: 'absolute', bottom: '100px', right: '20px', width: '45px', height: '45px', borderRadius: '50%', backgroundColor: '#da1b60', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.6)', zIndex: 50, transition: 'all 0.2s' }}>
                  <ChevronDown size={28} />
                </button>
              )}

              <div style={{ padding: '20px', backgroundColor: '#140f24', borderTop: '2px solid #231b3a', boxShadow: '0 -4px 15px rgba(0,0,0,0.3)' }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <ChevronRight style={{ position: 'absolute', left: '14px', color: '#da1b60' }} size={20} />
                  
                  <input type="file" accept="image/*" ref={chatImageInputRef} onChange={handleChatImageUpload} style={{ display: 'none' }} />
                  
                  <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder={`Inserisci direttiva tecnica o allega screen...`} style={{ width: '100%', backgroundColor: '#090710', border: '2px solid #231b3a', padding: '16px 90px 16px 42px', fontSize: '16px', color: '#ffffff', borderRadius: '8px', outline: 'none', fontWeight: '500' }} />
                  
                  <div style={{ position: 'absolute', right: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button onClick={() => chatImageInputRef.current.click()} disabled={isTyping} style={{ background: 'none', border: 'none', color: '#a855f7', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }} title="Allega Screen FM">
                      <ImageIcon size={22} />
                    </button>
                    <button onClick={handleSendMessage} disabled={isTyping} style={{ background: 'none', border: 'none', color: '#da1b60', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }} title="Invia Dati">
                      <Send size={22} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {(!isMobile || mobileViewTab === 'tools') && (
            <div style={{ width: isMobile ? '100%' : '460px', backgroundColor: '#0f0c1b', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', borderLeft: isMobile ? 'none' : '2px solid #231b3a', boxSizing: 'border-box', overflowY: 'auto' }}>
              
              {activeRoom === 'board' && (
                <>
                  <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#a855f7', borderBottom: '2px solid #231b3a', paddingBottom: '8px', margin: 0, fontWeight: '900' }}>Database Operativo</h3>
                  <div style={{ backgroundColor: '#140f24', border: '1px solid #231b3a', padding: '14px', borderRadius: '6px' }}>
                    <label style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>Club Attuale</label>
                    <input type="text" value={clubName} onChange={(e) => setClubName(e.target.value)} style={{ width: '92%', backgroundColor: '#090710', border: '2px solid #231b3a', padding: '10px', color: '#ffffff', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '14px', borderRadius: '4px' }} />
                  </div>
                  <div style={{ backgroundColor: '#140f24', border: '1px solid #231b3a', padding: '16px', borderRadius: '6px', fontSize: '14px', lineHeight: '1.6' }}>
                    <span style={{ color: '#22d3ee', display: 'block', marginBottom: '8px', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '12px' }}>📊 Stato Dati:</span>
                    • Record Calciatori Schedati: <strong style={{ color: '#fff' }}>{Array.isArray(players) ? players.length : 0}</strong><br />
                    • Bilancio Club: <strong style={{ color: '#10b981' }}>€{finances?.balance?.toLocaleString() || 0}</strong><br />
                    • Budget Trasferimenti: <strong style={{ color: '#fff' }}>€{finances?.transfer_budget?.toLocaleString() || 0}</strong>
                  </div>
                </>
              )}

              {activeRoom === 'vice' && (
                <>
                  <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#22d3ee', borderBottom: '2px solid #231b3a', paddingBottom: '8px', margin: 0, fontWeight: '900' }}>Tattica & Match Engine</h3>
                  
                  <div style={{ backgroundColor: '#140f24', border: '1px solid #231b3a', padding: '14px', borderRadius: '6px', marginBottom: '4px' }}>
                     <span style={{ fontSize: '11px', color: '#22d3ee', fontWeight: 'bold', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>⚔️ Tactical Solver (Avversario):</span>
                     <input type="file" accept="image/*" ref={vicePreMatchRef} onChange={handlePreMatchAnalysis} style={{ display: 'none' }} />
                     <button onClick={() => vicePreMatchRef.current.click()} disabled={isTyping} style={{ width: '100%', backgroundColor: '#090710', border: '2px solid #22d3ee', color: '#22d3ee', padding: '12px', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', borderRadius: '4px', cursor: 'pointer' }}>📸 Calcola Contromisure (Screen)</button>
                  </div>

                  <div style={{ backgroundColor: '#140f24', border: '1px solid #231b3a', padding: '14px', borderRadius: '6px', marginBottom: '4px' }}>
                     <span style={{ fontSize: '11px', color: '#22d3ee', fontWeight: 'bold', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>👁️ Sinergie Tattiche:</span>
                     <input type="file" accept="image/*" ref={viceTacticInputRef} onChange={handleViceImageUpload} style={{ display: 'none' }} />
                     <button onClick={() => viceTacticInputRef.current.click()} disabled={isTyping} style={{ width: '100%', backgroundColor: '#22d3ee', color: '#090710', border: 'none', padding: '12px', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', borderRadius: '4px', cursor: 'pointer' }}>📸 Analizza Modulo (Screen)</button>
                  </div>

                  <textarea value={externalTacticInput} onChange={(e) => setExternalTacticInput(e.target.value)} placeholder="Incolla l'analisi della tattica o i ruoli (in testo)..." style={{ width: '94%', height: '140px', backgroundColor: '#090710', border: '2px solid #231b3a', padding: '12px', color: '#ffffff', fontSize: '15px', resize: 'none', borderRadius: '6px', marginTop: '10px' }} />
                  <button onClick={handleAnalyzeExternalTactic} disabled={isTyping} style={{ backgroundColor: '#22d3ee', color: '#0f0b1b', border: 'none', padding: '14px', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', borderRadius: '6px', cursor: 'pointer', width: '100%', boxShadow: '0 4px 12px rgba(34,211,238,0.2)' }}>Elabora Dati Testuali</button>
                  
                  <div style={{ marginTop: '15px', backgroundColor: '#140f24', padding: '14px', borderRadius: '8px', border: '1px solid #231b3a' }}>
                    <span style={{ fontSize: '11px', color: '#22d3ee', fontWeight: 'bold', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>📂 Tattiche Salvate:</span>
                    {(!Array.isArray(tacticReports) || tacticReports.length === 0) ? <div style={{ fontSize: '12px', color: '#475569', fontStyle: 'italic' }}>Nessun report.</div> : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {tacticReports.map((rep, idx) => (
                          <button key={rep?.id || idx} onClick={() => setSelectedTacticReport(rep)} style={{ width: '100%', textAlign: 'left', backgroundColor: '#090710', border: '1px solid #231b3a', padding: '10px', borderRadius: '6px', color: '#fff', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold' }}>⚡ {rep?.title || 'Tattica'}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {activeRoom === 'scout' && (
                <>
                  <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#f43f5e', borderBottom: '2px solid #231b3a', paddingBottom: '8px', margin: 0, fontWeight: '900' }}>Data Scouting CA/PA</h3>
                  <input type="file" accept="image/*" ref={scoutInputRef} onChange={handleScoutImageUpload} style={{ display: 'none' }} />
                  <button onClick={() => scoutInputRef.current.click()} disabled={isTyping} style={{ width: '100%', backgroundColor: '#f43f5e', color: '#ffffff', border: 'none', padding: '14px', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', borderRadius: '6px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(244,63,94,0.3)' }}>Scansiona Attributi Profilo</button>
                  
                  <div style={{ marginTop: '15px', backgroundColor: '#140f24', padding: '14px', borderRadius: '8px', border: '1px solid #231b3a' }}>
                    <span style={{ fontSize: '11px', color: '#f43f5e', fontWeight: 'bold', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>🎯 Shortlist Dinamica:</span>
                    {(!Array.isArray(shortlist) || shortlist.length === 0) ? <div style={{ fontSize: '12px', color: '#475569', fontStyle: 'italic' }}>Lista vuota.</div> : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {shortlist.map((s, idx) => (
                          <div key={s?.id || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#090710', border: '1px solid #231b3a', padding: '10px', borderRadius: '6px' }}>
                            <span style={{ color: '#fff', fontSize: '13px', fontWeight: 'bold' }}>{s?.name} <span style={{ color: '#f43f5e', fontSize: '10px' }}>({s?.verdict})</span></span>
                            <button onClick={() => handleRemoveFromShortlist(s?.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><X size={16} /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {activeRoom === 'ds' && (
                <>
                  <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#fbbf24', borderBottom: '2px solid #231b3a', paddingBottom: '8px', margin: 0, fontWeight: '900' }}>Squad Planner</h3>
                  <div style={{ backgroundColor: '#140f24', border: '2px solid #231b3a', padding: '16px', borderRadius: '6px', fontSize: '14px', lineHeight: '1.6', color: '#ffffff' }}>
                    <span style={{ color: '#fbbf24', fontWeight: 'bold', display: 'block', marginBottom: '8px', textTransform: 'uppercase', fontSize: '12px' }}>🧹 Filtro Esuberi Tattici:</span>
                    Scrivi il modulo in uso. Il Planner scansionerà la rosa segnalando i giocatori con attributi incompatibili.
                  </div>
                  <textarea value={dsTacticInput} onChange={(e) => setDsTacticInput(e.target.value)} placeholder="Inserisci il modulo (es. 4-2-3-1 Gegenpress)..." style={{ width: '94%', height: '80px', backgroundColor: '#090710', border: '2px solid #231b3a', padding: '12px', color: '#ffffff', fontSize: '14px', resize: 'none', borderRadius: '6px', marginTop: '10px' }} />
                  <button onClick={handleAnalyzeSquadEsuberi} disabled={isTyping} style={{ backgroundColor: '#fbbf24', color: '#0f0b1b', border: 'none', padding: '14px', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', borderRadius: '6px', cursor: 'pointer', width: '100%', boxShadow: '0 4px 12px rgba(251,191,36,0.2)' }}>Calcola Tagli Rosa</button>
                </>
              )}

              {activeRoom === 'cfo' && (
                <>
                  <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#10b981', borderBottom: '2px solid #231b3a', paddingBottom: '8px', margin: 0, fontWeight: '900' }}>Analisi Finanziaria</h3>
                  <div style={{ backgroundColor: '#140f24', border: '1px solid #231b3a', padding: '14px', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <input type="file" accept="image/*" ref={financeInputRef} onChange={handleFinanceImageUpload} style={{ display: 'none' }} />
                    <button onClick={() => financeInputRef.current.click()} disabled={isTyping} style={{ width: '100%', backgroundColor: '#10b981', color: '#0f0c1b', border: 'none', padding: '12px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer', borderRadius: '4px' }}>Estrai Dati Screen Bilancio</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                    <div><label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold' }}>Bilancio Societario (€)</label><input type="number" value={finances?.balance || 0} onChange={(e) => updateFinancesCloud('balance', e.target.value)} style={{ width: '92%', backgroundColor: '#090710', border: '2px solid #231b3a', padding: '8px', color: '#10b981', fontWeight: 'bold', borderRadius: '4px' }} /></div>
                    <div><label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold' }}>Budget Mercato (€)</label><input type="number" value={finances?.transfer_budget || 0} onChange={(e) => updateFinancesCloud('transfer_budget', e.target.value)} style={{ width: '92%', backgroundColor: '#090710', border: '2px solid #231b3a', padding: '8px', color: '#fff', borderRadius: '4px' }} /></div>
                  </div>
                  <div style={{ backgroundColor: '#140f24', border: '1px solid #231b3a', padding: '14px', borderRadius: '6px', marginTop: '12px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#fff', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>📊 Predizione Ammortamento</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input type="number" value={simCost} onChange={(e) => setSimCost(e.target.value)} placeholder="Costo" style={{ width: '45%', backgroundColor: '#090710', border: '1px solid #231b3a', padding: '6px', color: '#fff', fontSize: '12px', borderRadius: '4px' }} />
                      <input type="number" value={simWage} onChange={(e) => setSimWage(e.target.value)} placeholder="Stip." style={{ width: '45%', backgroundColor: '#090710', border: '1px solid #231b3a', padding: '6px', color: '#fff', fontSize: '12px', borderRadius: '4px' }} />
                    </div>
                    <button onClick={handleSimulateTransfer} style={{ backgroundColor: '#10b981', color: '#0f0c1b', border: 'none', padding: '8px', fontSize: '11px', fontWeight: 'bold', borderRadius: '4px', marginTop: '10px', width: '100%', cursor: 'pointer' }}>Calcola Impatto Finanziario</button>
                    {simResult && <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#090710', borderLeft: `3px solid ${simResult.color}`, fontSize: '12px', color: '#fff' }}>{simResult.notes}</div>}
                  </div>
                  <button onClick={handleFinanceAudit} disabled={isTyping} style={{ backgroundColor: '#da1b60', color: '#fff', border: 'none', padding: '12px', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', borderRadius: '6px', marginTop: '12px', width: '100%', cursor: 'pointer' }}>Esegui Audit Contratti</button>
                </>
              )}

              {activeRoom === 'press' && (
                <>
                  <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#ec4899', borderBottom: '2px solid #231b3a', paddingBottom: '8px', margin: 0, fontWeight: '900' }}>Setup Manageriale</h3>
                  <div style={{ backgroundColor: '#140f24', border: '1px solid #231b3a', padding: '12px', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: '#ec4899', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>🎭 Personalità Base:</label>
                      <select value={personality} onChange={(e) => setPersonality(e.target.value)} style={{ width: '100%', backgroundColor: '#090710', border: '2px solid #231b3a', padding: '8px', color: '#fff', fontSize: '13px', borderRadius: '4px' }}>
                        <option value="professional">💼 Professional (Diplomatico)</option>
                        <option value="aggressive">🔥 Aggressive (Mourinhiano)</option>
                        <option value="passionate">❤️ Passionate (Sanguigno)</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: '#ec4899', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>🎙️ Gestione Media:</label>
                      <select value={pressStyle} onChange={(e) => setPressStyle(e.target.value)} style={{ width: '100%', backgroundColor: '#090710', border: '2px solid #231b3a', padding: '8px', color: '#fff', fontSize: '13px', borderRadius: '4px' }}>
                        <option value="diplomatic">Istituzionale / Calmo</option>
                        <option value="sardonic">Ironico / Provocatorio</option>
                        <option value="explosive">Esplosivo / Schietto</option>
                        <option value="silent">No Comment Tattico</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: '#ec4899', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>🛡️ Gestione Spogliatoio:</label>
                      <select value={squadShield} onChange={(e) => setSquadShield(e.target.value)} style={{ width: '100%', backgroundColor: '#090710', border: '2px solid #231b3a', padding: '8px', color: '#fff', fontSize: '13px', borderRadius: '4px' }}>
                        <option value="shield_total">Scudo Totale (Colpa mia)</option>
                        <option value="carot_stick">Bastone e Carota</option>
                        <option value="public_audit">Strigliata Pubblica</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: '#ec4899', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>🥊 Rapporto Allenatori Rivali:</label>
                      <select value={rivalRelation} onChange={(e) => setRivalRelation(e.target.value)} style={{ width: '100%', backgroundColor: '#090710', border: '2px solid #231b3a', padding: '8px', color: '#fff', fontSize: '13px', borderRadius: '4px' }}>
                        <option value="provocative">Mind Games</option>
                        <option value="respectful">Fair-play Assoluto</option>
                        <option value="indifferent">Indifferenza Totale</option>
                      </select>
                    </div>
                  </div>
                  <input type="file" accept="image/*" ref={pressInputRef} onChange={handlePressImageUpload} style={{ display: 'none' }} />
                  <button onClick={() => pressInputRef.current.click()} disabled={isTyping} style={{ width: '100%', backgroundColor: '#ec4899', color: '#fff', border: 'none', padding: '14px', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', borderRadius: '6px', cursor: 'pointer', marginTop: '12px' }}>Ottimizza Risposta Media (Screen)</button>
                </>
              )}

              {activeRoom === 'youth' && (
                <>
                  <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#ffaa00', borderBottom: '2px solid #231b3a', paddingBottom: '8px', margin: 0, fontWeight: '900' }}>Sviluppo Under 20</h3>
                  <input type="file" accept="image/*" ref={youthInputRef} onChange={handleYouthImageUpload} style={{ display: 'none' }} />
                  <button onClick={() => youthInputRef.current.click()} disabled={isTyping} style={{ width: '100%', backgroundColor: '#ffaa00', color: '#0f0c1b', border: 'none', padding: '12px', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', borderRadius: '6px', cursor: 'pointer' }}>Analizza Wonderkid (Screen)</button>
                </>
              )}

              {activeRoom === 'analyst' && (
                <>
                  <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#3b82f6', borderBottom: '2px solid #231b3a', paddingBottom: '8px', margin: 0, fontWeight: '900' }}>Data Hub / Match Analysis</h3>
                  <input type="file" accept="image/*" ref={analystInputRef} onChange={handleAnalystImageUpload} style={{ display: 'none' }} />
                  <button onClick={() => analystInputRef.current.click()} disabled={isTyping} style={{ width: '100%', backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '12px', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', borderRadius: '6px', cursor: 'pointer' }}>Analizza Statistiche (Screen)</button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderMasterDatabase() {
    const safePlayers = Array.isArray(players) ? players : [];
    const safeShortlist = Array.isArray(shortlist) ? shortlist : [];
    const safeMatches = Array.isArray(matches) ? matches : [];

    const firstTeamPlayers = safePlayers.filter(p => p && p.type === 'player' && (p.age >= 20 || !p.age));
    const youthPlayers = safePlayers.filter(p => p && p.type === 'player' && p.age && p.age < 20);
    
    let visibleList = [];
    if (dbSubTab === 'first_team') visibleList = firstTeamPlayers;
    else if (dbSubTab === 'youth') visibleList = youthPlayers;

    const getSortValue = (player, field) => {
      if (!player) return '';
      switch(field) {
        case 'name': return (player.name || '').toLowerCase().trim();
        case 'position': return (player.position || '').toLowerCase().trim();
        case 'age': return parseInt(player.age) || 0;
        case 'pres': return parseInt(String(player.attributes?.Presenze || '0').replace(/\D/g, '')) || 0;
        case 'gol': return parseInt(String(player.attributes?.Gol || '0').replace(/\D/g, '')) || 0;
        case 'mv': return parseFloat(String(player.attributes?.['Media Voto'] || '0').replace(',', '.')) || 0;
        default: return '';
      }
    };

    const sortedList = [...visibleList].sort((a, b) => {
      const valA = getSortValue(a, sortField); const valB = getSortValue(b, sortField);
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#0f0c1b', height: '100%', overflow: 'hidden', width: '100%' }}>
        <div style={{ height: 'auto', minHeight: '75px', padding: '12px 16px', borderBottom: '2px solid #231b3a', display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', backgroundColor: '#161224', justifyContent: 'space-between', gap: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>
          <div style={{ display: 'flex', gap: '8px', backgroundColor: '#090710', padding: '6px', border: '1px solid #231b3a', borderRadius: '6px', overflowX: 'auto', width: isMobile ? '100%' : 'auto' }}>
            <button onClick={() => setDbSubTab('first_team')} style={{ padding: '8px 16px', border: 'none', fontSize: '13px', fontWeight: 'bold', backgroundColor: dbSubTab === 'first_team' ? '#da1b60' : 'transparent', color: '#fff', borderRadius: '4px', flexShrink: 0, cursor: 'pointer' }}>Prima Squadra ({firstTeamPlayers.length})</button>
            <button onClick={() => setDbSubTab('youth')} style={{ padding: '8px 16px', border: 'none', fontSize: '13px', fontWeight: 'bold', backgroundColor: dbSubTab === 'youth' ? '#ffaa00' : 'transparent', color: '#fff', borderRadius: '4px', flexShrink: 0, cursor: 'pointer' }}>Under 20 ({youthPlayers.length})</button>
            <button onClick={() => setDbSubTab('shortlist')} style={{ padding: '8px 16px', border: 'none', fontSize: '13px', fontWeight: 'bold', backgroundColor: dbSubTab === 'shortlist' ? '#f43f5e' : 'transparent', color: '#fff', borderRadius: '4px', flexShrink: 0, cursor: 'pointer' }}>🎯 Shortlist ({safeShortlist.length})</button>
            <button onClick={() => setDbSubTab('matches')} style={{ padding: '8px 16px', border: 'none', fontSize: '13px', fontWeight: 'bold', backgroundColor: dbSubTab === 'matches' ? '#3b82f6' : 'transparent', color: '#fff', borderRadius: '4px', flexShrink: 0, cursor: 'pointer' }}>🏆 Storico ({safeMatches.length})</button>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUploadOCR} style={{ display: 'none' }} />
            
            {!isMobile && safePlayers.length > 0 && (
              <button onClick={handleForceSync} disabled={isUploading} style={{ backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '10px 16px', fontSize: '12px', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer' }}>{isUploading ? 'Sincro...' : '☁️ Forza Sincro Cloud'}</button>
            )}

            <button onClick={() => fileInputRef.current.click()} disabled={isUploading} style={{ backgroundColor: isUploading ? '#fbbf24' : '#da1b60', color: isUploading ? '#0f0c1b' : '#fff', border: 'none', padding: '10px 20px', fontSize: '12px', fontWeight: 'bold', borderRadius: '6px', cursor: isUploading ? 'not-allowed' : 'pointer' }}>
              {isUploading ? '⏳ SCANSIONE...' : 'Estrai Dati Squadra (Screen)'}
            </button>
            {safePlayers.length > 0 && <button onClick={handleClearAllData} style={{ backgroundColor: 'transparent', border: '2px solid #ef4444', color: '#ef4444', padding: '10px 16px', fontSize: '12px', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer' }}>Svuota DB</button>}
          </div>
        </div>

        <div style={{ flex: 1, padding: isMobile ? '12px' : '24px', overflowY: 'auto', backgroundColor: '#090710', width: '100%', boxSizing: 'border-box' }}>
          
          {isUploading && (dbSubTab === 'first_team' || dbSubTab === 'youth') ? (
            <div
