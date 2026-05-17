import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient'
import { MessageSquare, Database, Send, Users, Sliders, TrendingUp, ImageIcon, X, Briefcase, ChevronRight, HelpCircle, Award, Activity, Search, Trash2, ChevronDown } from 'lucide-react'
import { GoogleGenerativeAI } from '@google/generative-ai'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// ==========================================
// IL CERVELLO DI FM26 (MEMORIA TATTICA PERMANENTE)
// ==========================================
const FM26_CORE_ENGINE = `
IL TUO CERVELLO È BASATO SUL MOTORE DI GIOCO DI FOOTBALL MANAGER 2026 E SUI BIG DATA.
Sei uno staff umano, discorsivo ma tecnicamente e statisticamente ineccepibile. 

[!!! REGOLA DELLA SINTESI ASSOLUTA !!!]
Rispondi in modo ESTREMAMENTE CONCISO. Vai dritto al punto. Usa al massimo 3-4 righe o elenchi puntati molto brevi. Niente preamboli. NESSUNA LAVAGNA TATTICA O JSON.

[!!! REGOLA DEGLI ATTRIBUTI E DEI DATI !!!]
Valuta i giocatori in base ai DATI ROSA ATTUALE forniti o alle IMMAGINI allegate. Usa gli attributi da 1 a 20 per giustificare le tue scelte. NON chiedere al Mister di inviarti screenshot se hai già i dati. 

[!!! REGOLA LINGUISTICA CRITICA !!!]
- I RUOLI DEI GIOCATORI devono essere ESCLUSIVAMENTE IN INGLESE (es: **Box To Box Midfielder**, **Advanced Forward**).
- I COMPITI (es: **Difendere**, **Sostenere**, **Attaccare**) e LE ISTRUZIONI DI SQUADRA devono essere in ITALIANO.
- EVIDENZIA SEMPRE in **GRASSETTO** i termini tattici.
`;

// INIEZIONE DELLA MEMORIA TATTICA NEL PROMPT GLOBALE
const getRolePrompt = (role, clubName, clubVision, finances, squadContext, shortlistContext, matchesContext, tacticalFocus, tacticReports) => {
  const baseRules = FM26_CORE_ENGINE + `\nSEI UN PROFESSIONISTA DEL CLUB: ${clubName.toUpperCase()}.\n`;
  
  // Compattiamo le tattiche salvate per non sforare i limiti di memoria
  const savedTacticsSummary = tacticReports && tacticReports.length > 0 
    ? tacticReports.map(t => `${t.title}: ${t.content.substring(0, 250)}...`).join(' | ') 
    : 'Nessuna tattica specifica assimilata in archivio.';

  const contextData = `
🎯 VISIONE SOCIETARIA A LUNGO TERMINE: "${clubVision}"
📋 TATTICHE ASSIMILATE DAL MISTER (Il nostro Playbook): ${savedTacticsSummary}
DATI ROSA ATTUALE: ${JSON.stringify(squadContext.slice(0, 40))}
`;

  if (role === 'vice') return baseRules + `RUOLO: VICE ALLENATORE E TATTICO DI FM26. Uomo di campo, sanguigno ma iper-sintetico. Discuti di tattica basandoti sui numeri reali dei giocatori e sulle TATTICHE ASSIMILATE che il Mister ti ha fatto studiare.` + contextData;
  if (role === 'ds') return baseRules + `RUOLO: DIRETTORE SPORTIVO. Cinico, focalizzato su bilanci e plusvalenze. Valuta esuberi e acquisti basandoti rigidamente sulle TATTICHE ASSIMILATE dal mister, sugli attributi e Media Voto.` + contextData;
  if (role === 'scout') return baseRules + `RUOLO: CAPO OSSERVATORE. Valuta se i giocatori negli screen hanno gli attributi adatti al Progetto e alle TATTICHE ASSIMILATE.` + `\nSHORTLIST: ${JSON.stringify(shortlistContext)}` + contextData;
  if (role === 'cfo') return baseRules + `RUOLO: CFO FINANZE. La cassa è di €${finances?.balance || 0}. Controlla che le spese siano in linea col Progetto.` + contextData;
  if (role === 'analyst') return baseRules + `RUOLO: MATCH ANALYST. Nerd dei dati. Analizza xG, Passaggi Chiave e zone di calore in 2 righe rispetto alle tattiche che usiamo.` + contextData;
  
  return baseRules + contextData;
};

function App() {
  const [activeRoom, setActiveRoom] = useState('board') 
  const [dbSubTab, setDbSubTab] = useState('first_team') 
  const [sortField, setSortField] = useState('name')
  const [sortDirection, setSortDirection] = useState('asc')
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  const [mobileViewTab, setMobileViewTab] = useState('chat')
  const [showScrollBottom, setShowScrollBottom] = useState(false) 
  const [pendingImages, setPendingImages] = useState([]);
  const [uploadProgressText, setUploadProgressText] = useState('')

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const [clubName, setClubName] = useState(() => localStorage.getItem('hq_club_name') || 'Sora')
  const [clubVision, setClubVision] = useState(() => localStorage.getItem('hq_club_vision') || 'Nessun obiettivo a lungo termine impostato. La squadra naviga a vista.') 
  
  const [players, setPlayers] = useState(() => { try { return JSON.parse(localStorage.getItem('hq_players')) || []; } catch(e) { return []; } })
  const [shortlist, setShortlist] = useState(() => { try { return JSON.parse(localStorage.getItem('hq_shortlist')) || []; } catch(e) { return []; } })
  const [matches, setMatches] = useState(() => { try { return JSON.parse(localStorage.getItem('hq_matches')) || []; } catch(e) { return []; } })
  const [messages, setMessages] = useState(() => { try { return JSON.parse(localStorage.getItem('hq_messages')) || [{ sender_role: 'system', content: 'Memoria Tattica Permanente attivata. Le tattiche analizzate e salvate in archivio diventeranno il DNA dello staff.' }]; } catch(e) { return [{ sender_role: 'system', content: 'Centrale operativa allineata.' }]; } })
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
  useEffect(() => { localStorage.setItem('hq_club_vision', clubVision) }, [clubVision]) 

  useEffect(() => {
    if (chatContainerRef.current) { chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight; }
  }, [messages, isTyping])

  useEffect(() => { fetchCloudData(); }, []);

  const normalizeName = (name) => { return !name ? '' : name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(); };

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
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/i) || text.match(/```json([\s\S]*?)```/i);
    if (jsonMatch) displayString = text.replace(jsonMatch[0], '').trim();

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
    return <div>{lines}</div>;
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
    } catch (err) {}
  };

  const updateFinancesCloud = async (field, value) => {
    const numValue = parseFloat(value) || 0;
    const updatedFinances = { ...finances, [field]: numValue };
    setFinances(updatedFinances);
    try { await supabase.from('club_finances').update({ [field]: numValue }).eq('id', 1); } catch (e) {}
  };

  const handleForceSync = async () => {
    try {
      const safePlayers = Array.isArray(players) ? players : [];
      if (safePlayers.length === 0) { alert("Nessun giocatore in memoria."); return; }
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
      setMessages([{ sender_role: 'system', content: 'Centrale resettata con successo. Sede pulita.' }]);
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
      const systemNote = { sender_role: 'system', content: `📝 Fascicolo aggiornato per ${selectedProfile.name}` };
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
    if (cost > finances.transfer_budget) { status = 'BLOCCATO'; color = '#ef4444'; notes = `Fondi insufficienti nel budget trasferimenti.`; }
    else if (weeklyWage > (finances.wage_budget * 0.3)) { status = 'RISCHIO SPOGLIATOIO'; color = '#ffaa00'; notes = `L'ingaggio supera il 30% del tetto salariale.`; }
    setSimResult({ status, color, annualAmortization, annualWageCost, notes });
  };

  const handleSort = (field) => {
    if (sortField === field) { setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc'); } 
    else { setSortField(field); setSortDirection('asc'); }
  };

  const handlePendingImagesSelection = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      setPendingImages(prev => [...prev, ...filesArray]);
    }
    if (chatImageInputRef.current) chatImageInputRef.current.value = "";
  };

  const removePendingImage = (index) => { setPendingImages(prev => prev.filter((_, i) => i !== index)); };

  const handleSendMessage = async () => {
    if (!chatInput.trim() && pendingImages.length === 0) return;
    
    const currentInputText = chatInput.trim(); 
    const imagesToSend = [...pendingImages];
    
    setChatInput(''); setPendingImages([]); setIsTyping(true);
    
    let displayMsg = currentInputText;
    if (imagesToSend.length > 0) {
      displayMsg = currentInputText ? `📷 [${imagesToSend.length} Immagini allegate] ${currentInputText}` : `📷 [${imagesToSend.length} Immagini allegate] Analizzate questi screen.`;
    }

    const userRole = `user:${activeRoom}`; 
    const userMessageObj = { sender_role: userRole, content: displayMsg };
    setMessages(prev => [...prev, userMessageObj]);

    try { await supabase.from('club_messages').insert([userMessageObj]); } catch(e) {}

    try {
      const safePlayers = Array.isArray(players) ? players : [];
      const squadContext = safePlayers.map(p => ({ nome: p?.name, ruoli: p?.position, stats: p?.attributes || {} }));
      const shortlistContext = Array.isArray(shortlist) ? shortlist.slice(0, 15) : [];
      const matchesContext = Array.isArray(matches) ? matches.slice(0, 5) : [];

      let instructionPrompt = getRolePrompt(activeRoom, clubName, clubVision, finances, squadContext, shortlistContext, matchesContext, tacticalFocus, tacticReports);

      if (imagesToSend.length > 0) {
        instructionPrompt += `\n\nIL MISTER TI HA ALLEGATO ${imagesToSend.length} IMMAGINI E DICE: "${currentInputText || 'Analizza queste immagini basandoti sul tuo ruolo e sulle nostre Tattiche in archivio.'}"`;
      } else {
        instructionPrompt += `\n\nIL MISTER TI DICE: "${currentInputText}"`;
      }

      const imageParts = await Promise.all(imagesToSend.map(file => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => { resolve({ inlineData: { data: reader.result.split(',')[1], mimeType: file.type } }); };
          reader.readAsDataURL(file);
        });
      }));

      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const promptArray = [instructionPrompt, ...imageParts];
      
      const result = await model.generateContent(promptArray);
      const aiMessageObj = { sender_role: activeRoom, content: result.response.text() };
      setMessages(prev => [...prev, aiMessageObj]);
      try { await supabase.from('club_messages').insert([aiMessageObj]); } catch(e) {}
    } catch (error) { console.error(error); } finally { setIsTyping(false); }
  };

  const handlePreMatchAnalysis = async (event) => {
    const file = event.target.files[0]; if (!file) return; setIsTyping(true); if (isMobile) setMobileViewTab('chat');
    try {
      const reader = new FileReader(); reader.onloadend = async () => {
        const imagePart = { inlineData: { data: reader.result.split(',')[1], mimeType: file.type } };
        const safePlayers = Array.isArray(players) ? players : [];
        const squadContext = safePlayers.map(p => ({ nome: p?.name, ruoli: p?.position, stats: p?.attributes || {} }));
        const instructionPrompt = getRolePrompt('vice', clubName, clubVision, finances, squadContext, [], [], tacticalFocus, tacticReports) + 
        `\n\nIL MISTER TI HA DATO LO SCREEN DELL'AVVERSARIO. FAI UN BRIEFING PRE-PARTITA FM26 molto sintetico in base alla Tattica in Archivio.`;

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent([instructionPrompt, imagePart]); const output = result.response.text();
        const userMsg = { sender_role: `user:vice`, content: `📷 Mister ha appeso alla lavagna lo schieramento degli avversari.` };
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
        const safePlayers = Array.isArray(players) ? players : [];
        const squadContext = safePlayers.map(p => ({ nome: p?.name, ruoli: p?.position, stats: p?.attributes || {} }));
        const instructionPrompt = getRolePrompt('vice', clubName, clubVision, finances, squadContext, [], [], tacticalFocus, tacticReports) + 
        `\n\nIL MISTER TI HA MOSTRATO UNO SCREEN. Analizzalo e dammi consigli diretti.`;
        
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent([instructionPrompt, imagePart]); const output = result.response.text();
        const userMsg = { sender_role: `user:vice`, content: `📷 Mister ha mostrato uno screen di gioco al Vice.` };
        const aiMsg = { sender_role: 'vice', content: output }; setMessages(prev => [...prev, userMsg, aiMsg]);
        try { await supabase.from('club_messages').insert([userMsg, aiMsg]); } catch(e) {}
      }; reader.readAsDataURL(file);
    } catch (err) { console.error(err); } finally { setIsTyping(false); }
  };

  const handleAnalyzeExternalTactic = async () => {
    if (!externalTacticInput.trim()) return; setIsTyping(true); if (isMobile) setMobileViewTab('chat');
    const inputBuffer = externalTacticInput; setExternalTacticInput('');
    try {
      const safePlayers = Array.isArray(players) ? players : [];
      const squadContext = safePlayers.map(p => ({ nome: p?.name, ruoli: p?.position, stats: p?.attributes || {} }));
      const instructionPrompt = getRolePrompt('vice', clubName, clubVision, finances, squadContext, [], [], tacticalFocus, tacticReports) + 
      `\n\nSTUDIA QUESTA NUOVA TATTICA O GUIDA CHE TI HA PASSATO IL MISTER: """${inputBuffer}""". Memorizzala e fanne un riassunto telegrafico di 4 righe sui concetti chiave. Inizia con TITOLO: [Nome breve della tattica]`;
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(instructionPrompt); const outputText = result.response.text();
      const cleanTitle = (outputText.match(/TITOLO:\s*(.*)/i)?.[1] || `Tattica del ${new Date().toLocaleDateString()}`).replace('[', '').replace(']', '').trim();
      const userMsg = { sender_role: `user:vice`, content: `📋 Studia e memorizza questa nuova tattica/guida: "${inputBuffer.substring(0,30)}..."` };
      const aiMsg = { sender_role: 'vice', content: outputText }; setMessages(prev => [...prev, userMsg, aiMsg]);
      setTacticReports(prev => [{ title: cleanTitle, content: outputText, id: Date.now() }, ...prev]); // SALVATAGGIO NELL'ARCHIVIO
      try { await supabase.from('club_messages').insert([userMsg, aiMsg]); } catch(e) {}
    } catch (error) { console.error(error); } finally { setIsTyping(false); }
  };

  const handleAnalyzeSquadEsuberi = async () => {
    if (!dsTacticInput.trim()) return; setIsTyping(true); if (isMobile) setMobileViewTab('chat');
    const inputBuffer = dsTacticInput; setDsTacticInput('');
    try {
      const safePlayers = Array.isArray(players) ? players : [];
      const squadContext = safePlayers.map(p => ({ nome: p?.name, ruolo: p?.position, stats: p?.attributes }));
      const instructionPrompt = getRolePrompt('ds', clubName, clubVision, finances, squadContext, [], [], tacticalFocus, tacticReports) + 
      `\n\nIL MISTER VUOLE GIOCARE COSÌ O FARE QUESTA AZIONE DI MERCATO: "${inputBuffer}". Guarda la rosa, sii breve e spietato nel dire chi non va bene.`;
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(instructionPrompt); const outputText = result.response.text();
      const userMsg = { sender_role: `user:ds`, content: `📋 Direttore, valuta la rosa per la tattica/idea: "${inputBuffer}". Chi dobbiamo cedere o su chi puntare?` };
      const aiMsg = { sender_role: 'ds', content: outputText }; setMessages(prev => [...prev, userMsg, aiMsg]);
      try { await supabase.from('club_messages').insert([userMsg, aiMsg]); } catch(e) {}
    } catch (error) { console.error(error); } finally { setIsTyping(false); }
  };

  const handleScoutImageUpload = async (event) => {
    const file = event.target.files[0]; if (!file) return; setIsTyping(true); if (isMobile) setMobileViewTab('chat');
    try {
      const reader = new FileReader(); reader.onloadend = async () => {
        const imagePart = { inlineData: { data: reader.result.split(',')[1], mimeType: file.type } };
        const prompt = getRolePrompt('scout', clubName, clubVision, finances, [], shortlist, [], tacticalFocus, tacticReports) + 
        `\n\nValuta questo giocatore. Output rigido: VERDETTO: [ACQUISTARE, RISERVA, EVITARE] NOME: [Nome] RUOLO: [Ruolo] REPORT: [Breve analisi]`;
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent([prompt, imagePart]); const output = result.response.text();
        const pName = (output.match(/NOME:\s*(.*)/i)?.[1] || 'Obiettivo Scansionato').trim();
        const pRole = (output.match(/RUOLO:\s*(.*)/i)?.[1] || 'N/D').trim();
        const pVerdict = (output.match(/VERDETTO:\s*(.*)/i)?.[1] || 'VALUTATO').trim();
        const userMsg = { sender_role: `user:scout`, content: `📷 Mister ha messo sul tavolo la scheda di un calciatore esterno.` };
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
        const prompt = getRolePrompt('press', clubName, clubVision, finances, [], [], [], tacticalFocus, tacticReports) + 
        `\n\nAnalizza lo screen della conferenza. Stile Mister: ${pressStyle}. Detta quale pulsante premere. Sii telegrafico.`;
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent([prompt, imagePart]); const output = result.response.text();
        const userMsg = { sender_role: `user:press`, content: `📷 Mister ha inoltrato uno screenshot della conferenza stampa in corso.` };
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
        const prompt = getRolePrompt('analyst', clubName, clubVision, finances, [], [], [], tacticalFocus, tacticReports) + 
        `\n\nCompila i dati post-gara FM26: AVVERSARIO: [Nome] RISULTATO: [Risultato] XG_TEAM: [xG] XG_OPP: [xG] ANALISI: [Solo numeri crudi e sintetici]`;
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent([prompt, imagePart]); const output = result.response.text();
        const mOpp = (output.match(/AVVERSARIO:\s*(.*)/i)?.[1] || 'Gara').trim();
        const mRes = (output.match(/RISULTATO:\s*(.*)/i)?.[1] || 'N/D').trim();
        const mXgT = (output.match(/XG_TEAM:\s*(.*)/i)?.[1] || '-').trim();
        const mXgO = (output.match(/XG_OPP:\s*(.*)/i)?.[1] || '-').trim();
        const userMsg = { sender_role: `user:analyst`, content: `📷 Mister ha caricato il tabellino visivo Data Hub.` };
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
        const prompt = getRolePrompt('cfo', clubName, clubVision, finances, [], [], [], tacticalFocus, tacticReports) + 
        `\n\nEstrai le finanze in JSON puro (senza formattazione markdown): { "balance": numero, "transfer_budget": numero, "wage_budget": numero, "analysis": "analisi sintetica" }`;
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent([prompt, imagePart]);
        const cleanText = result.response.text().replace(/```json/gi, '').replace(/```/g, '').trim();
        try {
          const parsed = JSON.parse(cleanText);
          if (parsed) {
            setFinances({ balance: parsed.balance || 0, transfer_budget: parsed.transfer_budget || 0, wage_budget: parsed.wage_budget || 0 });
            const userMsg = { sender_role: `user:cfo`, content: `📷 Mister ha inserito il rendiconto finanziario FM26.` };
            const aiMsg = { sender_role: 'cfo', content: parsed.analysis || "Audit completato." }; setMessages(prev => [...prev, userMsg, aiMsg]);
            try { await supabase.from('club_finances').update({ balance: parsed.balance || 0, transfer_budget: parsed.transfer_budget || 0, wage_budget: parsed.wage_budget || 0 }).eq('id', 1); await supabase.from('club_messages').insert([userMsg, aiMsg]); } catch (e) {}
          }
        } catch (jsonErr) { console.error("JSON Error", jsonErr); }
      }; reader.readAsDataURL(file);
    } catch (e) { console.error(e); } finally { setIsTyping(false); }
  };

  const handleFinanceAudit = async () => {
    setIsTyping(true); if (isMobile) setMobileViewTab('chat');
    try {
      const safePlayers = Array.isArray(players) ? players : [];
      const soraPlayersContext = safePlayers.map(p => ({ nome: p?.name, stipendio: p?.attributes?.Ingaggio || '-' }));
      const instructionPrompt = getRolePrompt('cfo', clubName, clubVision, finances, soraPlayersContext, [], [], tacticalFocus, tacticReports) + 
      `\n\nFAI UN AUDIT FINANZIARIO SINTETICO. Critica chi prende troppo.`;
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(instructionPrompt); const auditOutput = result.response.text();
      const userMsg = { sender_role: `user:cfo`, content: `📊 Mister ha richiesto un Audit sui contratti.` };
      const aiMsg = { sender_role: 'cfo', content: auditOutput }; setMessages(prev => [...prev, userMsg, aiMsg]);
      try { await supabase.from('club_messages').insert([userMsg, aiMsg]); } catch(e) {}
    } catch (e) { console.error(e); } finally { setIsTyping(false); }
  };

  const handleYouthImageUpload = async (event) => {
    const file = event.target.files[0]; if (!file) return; setIsTyping(true); if (isMobile) setMobileViewTab('chat');
    try {
      const reader = new FileReader(); reader.onloadend = async () => {
        const imagePart = { inlineData: { data: reader.result.split(',')[1], mimeType: file.type } };
        const prompt = getRolePrompt('youth', clubName, clubVision, finances, [], [], [], tacticalFocus, tacticReports) + 
        `\n\nValuta il wonderkid in modo entusiasta ma molto sintetico.`;
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent([prompt, imagePart]); const output = result.response.text();
        const userMsg = { sender_role: `user:youth`, content: `📷 Mister ha scansionato il cartellino di un giovane wonderkid del vivaio.` };
        const aiMsg = { sender_role: 'youth', content: output }; setMessages(prev => [...prev, userMsg, aiMsg]);
        try { await supabase.from('club_messages').insert([userMsg, aiMsg]); } catch(e){}
      }; reader.readAsDataURL(file);
    } catch (e) { console.error(e); } finally { setIsTyping(false); }
  };

  const handleImageUploadOCR = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    let totalExtracted = 0;
    
    setUploadProgressText(`⏳ Inizio scansione di ${files.length} immagini...`);

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgressText(`⏳ Analisi foto ${i + 1} di ${files.length} in corso...`);
        
        const imageBase64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result.split(',')[1]);
          reader.readAsDataURL(file);
        });

        const imagePart = { inlineData: { data: imageBase64, mimeType: file.type } };
        
        const prompt = `Estrai TUTTI i dati e OGNI SINGOLO ATTRIBUTO (Tecnici, Mentali, Fisici da 1 a 20) presenti in questo screenshot di Football Manager 2026.
        Voglio che raschi via ogni numero: Età, Presenze, Gol, Assist, Media Voto, Valore, Ingaggio e TUTTI gli attributi specifici del giocatore (es. Accelerazione, Passaggi, Contrasti, Visione di gioco, ecc.).
        Rispondi SOLO con un array JSON puro, senza formattazione Markdown. L'oggetto "attributes" deve contenere dinamicamente tutte le voci trovate:
        [ { "type": "player", "name": "Nome", "age": "num", "position": "Ruolo", "attributes": { "Presenze": "num", "Gol": "num", "Assist": "num", "Media Voto": "float", "Ingaggio": "txt", "Valore": "txt", "Passaggi": "15", "Freddezza": "12", "Velocità": "14" } } ]`;
        
        const result = await model.generateContent([prompt, imagePart]);
        const cleanText = result.response.text().replace(/```json/gi, '').replace(/```/g, '').trim();
        
        try {
          const extractedData = JSON.parse(cleanText);
          if (Array.isArray(extractedData)) {
            totalExtracted += extractedData.length;
            const sanitizedData = extractedData.map(p => {
              const ageVal = parseInt(p?.age);
              return { name: p?.name || 'Sconosciuto', position: p?.position || 'N/D', age: isNaN(ageVal) ? null : ageVal, type: p?.type || 'player', attributes: p?.attributes || {} };
            });

            setPlayers(prev => {
              const list = Array.isArray(prev) ? [...prev] : []; 
              sanitizedData.forEach(np => {
                const idx = list.findIndex(x => normalizeName(x?.name) === normalizeName(np.name));
                if (idx >= 0) { 
                  list[idx] = { ...list[idx], ...np, attributes: { ...(list[idx]?.attributes || {}), ...(np.attributes || {}) } }; 
                } 
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
      }
      
      setUploadProgressText(`✅ Scansione completata! Dati estratti da ${files.length} immagini. Aggiornati ${totalExtracted} profili.`);
      const systemNote = { sender_role: 'system', content: `✅ Database Aggiornato: estratti dati da ${files.length} screenshot. (${totalExtracted} giocatori).` };
      setMessages(prev => [...prev, systemNote]);
      try { await supabase.from('club_messages').insert([systemNote]); } catch(e) {}

    } catch (e) { 
      console.error(e); 
      setUploadProgressText("❌ Errore durante la scansione delle immagini.");
    } finally { 
      setTimeout(() => { setIsUploading(false); setUploadProgressText(''); }, 3500);
      if(fileInputRef.current) fileInputRef.current.value = "";
    } 
  };

  // 11. COMPONENTI DI RENDER E LAYOUT
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
              {activeRoom === 'board' ? '🏛️ RIUNIONE PLENARIA CON LO STAFF' : `💼 BRIEFING PRIVATO: ${activeRoom.toUpperCase()}`}
            </h2>
          </div>
        </div>

        {isMobile && (
          <div style={{ display: 'flex', backgroundColor: '#140f24', borderBottom: '2px solid #231b3a', padding: '8px', gap: '8px' }}>
            <button onClick={() => setMobileViewTab('chat')} style={{ flex: 1, padding: '12px', fontSize: '14px', fontWeight: '900', border: 'none', borderRadius: '6px', backgroundColor: mobileViewTab === 'chat' ? '#da1b60' : '#090710', color: '#fff', textTransform: 'uppercase' }}>💬 Leggi Dialogo</button>
            <button onClick={() => setMobileViewTab('tools')} style={{ flex: 1, padding: '12px', fontSize: '14px', fontWeight: '900', border: 'none', borderRadius: '6px', backgroundColor: mobileViewTab === 'tools' ? '#22d3ee' : '#090710', color: '#fff', textTransform: 'uppercase' }}>🛠️ Apri Strumenti</button>
          </div>
        )}

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', flexDirection: isMobile ? 'column' : 'row', position: 'relative' }}>
          {(!isMobile || mobileViewTab === 'chat') && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', borderRight: isMobile ? 'none' : '2px solid #231b3a', backgroundColor: '#090710', position: 'relative' }}>
              <div ref={chatContainerRef} onScroll={handleChatScroll} style={{ flex: 1, padding: isMobile ? '16px' : '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {visibleMessages.map((msg, index) => {
                  let align = 'flex-start'; let bColor = '#2c2347'; let nameLabel = 'STAFF'; let itemBg = '#140f24';
                  const role = msg?.sender_role ? String(msg.sender_role) : '';
                  if (role.startsWith('user')) { align = 'flex-end'; bColor = '#da1b60'; nameLabel = 'MISTER (OMISEREZ)'; itemBg = '#1d1433'; }
                  else if (role === 'vice') { bColor = '#22d3ee'; nameLabel = 'VICE ALLENATORE'; }
                  else if (role === 'ds') { bColor = '#fbbf24'; nameLabel = 'DIRETTORE SPORTIVO'; }
                  else if (role === 'scout') { bColor = '#f43f5e'; nameLabel = 'CAPO OSSERVATORE'; }
                  else if (role === 'cfo') { bColor = '#10b981'; nameLabel = 'CFO FINANZE'; }
                  else if (role === 'press') { bColor = '#ec4899'; nameLabel = 'UFFICIO STAMPA'; }
                  else if (role === 'youth') { bColor = '#ffaa00'; nameLabel = 'RESPONSABILE GIOVANILI'; }
                  else if (role === 'analyst') { bColor = '#3b82f6'; nameLabel = 'MATCH ANALYST'; }
                  else if (role === 'board') { bColor = '#a855f7'; nameLabel = 'VERBALE PLENARIA'; }
                  
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
                    <span style={{ fontSize: '11px', color: '#475569', fontWeight: 'bold', marginBottom: '4px' }}>CENTRALINA DI ELABORAZIONE</span>
                    <div style={{ padding: '14px', fontSize: '15px', backgroundColor: '#140f24', color: '#64748b', borderLeft: '4px solid #475569', borderRadius: '6px', fontStyle: 'italic' }}>Lo specialista sta elaborando i dati...</div>
                  </div>
                )}
              </div>

              {showScrollBottom && (
                <button onClick={scrollToBottom} style={{ position: 'absolute', bottom: '110px', right: '20px', width: '45px', height: '45px', borderRadius: '50%', backgroundColor: '#da1b60', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.6)', zIndex: 50, transition: 'all 0.2s' }}>
                  <ChevronDown size={28} />
                </button>
              )}

              <div style={{ padding: '16px 20px', backgroundColor: '#140f24', borderTop: '2px solid #231b3a', boxShadow: '0 -4px 15px rgba(0,0,0,0.3)', zIndex: 60 }}>
                {pendingImages.length > 0 && (
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', overflowX: 'auto', paddingBottom: '6px' }}>
                    {pendingImages.map((img, idx) => (
                      <div key={idx} style={{ position: 'relative', width: '60px', height: '60px', flexShrink: 0, borderRadius: '8px', overflow: 'hidden', border: '2px solid #a855f7', boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
                        <img src={URL.createObjectURL(img)} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button onClick={() => removePendingImage(idx)} style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(239, 68, 68, 0.9)', border: 'none', color: '#fff', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}><X size={12} /></button>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <ChevronRight style={{ position: 'absolute', left: '14px', color: '#da1b60' }} size={20} />
                  <input type="file" accept="image/*" multiple ref={chatImageInputRef} onChange={handlePendingImagesSelection} style={{ display: 'none' }} />
                  <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder={pendingImages.length > 0 ? "Aggiungi un commento alle foto..." : "Scrivi in chat o allega foto..."} style={{ width: '100%', backgroundColor: '#090710', border: '2px solid #231b3a', padding: '16px 90px 16px 42px', fontSize: '16px', color: '#ffffff', borderRadius: '8px', outline: 'none', fontWeight: '500' }} />
                  <div style={{ position: 'absolute', right: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button onClick={() => chatImageInputRef.current.click()} disabled={isTyping} style={{ background: 'none', border: 'none', color: '#a855f7', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }} title="Allega Screen"><ImageIcon size={22} /></button>
                    <button onClick={handleSendMessage} disabled={isTyping || (!chatInput.trim() && pendingImages.length === 0)} style={{ background: 'none', border: 'none', color: (chatInput.trim() || pendingImages.length > 0) ? '#da1b60' : '#475569', cursor: (chatInput.trim() || pendingImages.length > 0) ? 'pointer' : 'default', display: 'flex', alignItems: 'center', padding: '4px', transition: 'color 0.2s' }} title="Invia"><Send size={22} /></button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {(!isMobile || mobileViewTab === 'tools') && (
            <div style={{ width: isMobile ? '100%' : '460px', backgroundColor: '#0f0c1b', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', borderLeft: isMobile ? 'none' : '2px solid #231b3a', boxSizing: 'border-box', overflowY: 'auto' }}>
              
              {activeRoom === 'board' && (
                <>
                  <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#a855f7', borderBottom: '2px solid #231b3a', paddingBottom: '8px', margin: 0, fontWeight: '900' }}>Identità Societaria Sora</h3>
                  
                  <div style={{ backgroundColor: '#1d1433', border: '2px solid #a855f7', padding: '16px', borderRadius: '6px' }}>
                    <label style={{ fontSize: '12px', color: '#e2e8f0', textTransform: 'uppercase', display: 'block', marginBottom: '8px', fontWeight: '900' }}>🎯 Progetto e Visione a Lungo Termine</label>
                    <textarea 
                      value={clubVision} 
                      onChange={(e) => setClubVision(e.target.value)} 
                      placeholder="Esempio: Voglio creare un ecosistema stile Barcellona..." 
                      style={{ width: '100%', height: '100px', backgroundColor: '#090710', border: '1px solid #231b3a', padding: '12px', color: '#ffffff', fontSize: '14px', resize: 'none', borderRadius: '6px', boxSizing: 'border-box', lineHeight: '1.5' }} 
                    />
                    <div style={{ fontSize: '11px', color: '#a855f7', marginTop: '8px', fontStyle: 'italic' }}>*Lo staff leggerà questo manifesto in background per consigliarti al meglio.*</div>
                  </div>

                  <div style={{ backgroundColor: '#140f24', border: '1px solid #231b3a', padding: '14px', borderRadius: '6px' }}>
                    <label style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>Club Attuale in FM</label>
                    <input type="text" value={clubName} onChange={(e) => setClubName(e.target.value)} style={{ width: '92%', backgroundColor: '#090710', border: '2px solid #231b3a', padding: '10px', color: '#ffffff', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '14px', borderRadius: '4px' }} />
                  </div>
                  <div style={{ backgroundColor: '#140f24', border: '1px solid #231b3a', padding: '16px', borderRadius: '6px', fontSize: '14px', lineHeight: '1.6' }}>
                    <span style={{ color: '#22d3ee', display: 'block', marginBottom: '8px', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '12px' }}>📊 Stato Patrimoniale Attivo:</span>
                    • Calciatori Schedati: <strong style={{ color: '#fff' }}>{Array.isArray(players) ? players.length : 0}</strong><br />
                    • Cassa Club Globale: <strong style={{ color: '#10b981' }}>€{finances?.balance?.toLocaleString() || 0}</strong><br />
                    • Budget Trasferimenti: <strong style={{ color: '#fff' }}>€{finances?.transfer_budget?.toLocaleString() || 0}</strong>
                  </div>
                </>
              )}

              {activeRoom === 'vice' && (
                <>
                  <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#22d3ee', borderBottom: '2px solid #231b3a', paddingBottom: '8px', margin: 0, fontWeight: '900' }}>Laboratorio Tattico</h3>
                  
                  <div style={{ backgroundColor: '#140f24', border: '1px solid #231b3a', padding: '14px', borderRadius: '6px', marginBottom: '4px' }}>
                     <span style={{ fontSize: '11px', color: '#22d3ee', fontWeight: 'bold', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>⚔️ Briefing Pre-Gara:</span>
                     <input type="file" accept="image/*" ref={vicePreMatchRef} onChange={handlePreMatchAnalysis} style={{ display: 'none' }} />
                     <button onClick={() => vicePreMatchRef.current.click()} disabled={isTyping} style={{ width: '100%', backgroundColor: '#090710', border: '2px solid #22d3ee', color: '#22d3ee', padding: '12px', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', borderRadius: '4px', cursor: 'pointer' }}>📸 Carica Formazione Avversaria</button>
                  </div>

                  <div style={{ backgroundColor: '#140f24', border: '1px solid #231b3a', padding: '14px', borderRadius: '6px', marginBottom: '4px' }}>
                     <span style={{ fontSize: '11px', color: '#22d3ee', fontWeight: 'bold', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>👁️ Visione di Campo:</span>
                     <input type="file" accept="image/*" ref={viceTacticInputRef} onChange={handleViceImageUpload} style={{ display: 'none' }} />
                     <button onClick={() => viceTacticInputRef.current.click()} disabled={isTyping} style={{ width: '100%', backgroundColor: '#22d3ee', color: '#090710', border: 'none', padding: '12px', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', borderRadius: '4px', cursor: 'pointer' }}>📸 Mostra Screen al Vice</button>
                  </div>

                  <textarea value={externalTacticInput} onChange={(e) => setExternalTacticInput(e.target.value)} placeholder="Incolla l'analisi della tattica o il link esterno..." style={{ width: '94%', height: '140px', backgroundColor: '#090710', border: '2px solid #231b3a', padding: '12px', color: '#ffffff', fontSize: '15px', resize: 'none', borderRadius: '6px', marginTop: '10px' }} />
                  <button onClick={handleAnalyzeExternalTactic} disabled={isTyping} style={{ backgroundColor: '#22d3ee', color: '#0f0b1b', border: 'none', padding: '14px', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', borderRadius: '6px', cursor: 'pointer', width: '100%', boxShadow: '0 4px 12px rgba(34,211,238,0.2)' }}>Studia la Tattica</button>
                  
                  <div style={{ marginTop: '15px', backgroundColor: '#140f24', padding: '14px', borderRadius: '8px', border: '1px solid #231b3a' }}>
                    <span style={{ fontSize: '11px', color: '#22d3ee', fontWeight: 'bold', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>📂 Archivio Tattiche Rapido:</span>
                    {(!Array.isArray(tacticReports) || tacticReports.length === 0) ? <div style={{ fontSize: '12px', color: '#475569', fontStyle: 'italic' }}>Nessun report salvato nell'accesso rapido.</div> : (
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
                  <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#f43f5e', borderBottom: '2px solid #231b3a', paddingBottom: '8px', margin: 0, fontWeight: '900' }}>Osservatorio Acquisti</h3>
                  <input type="file" accept="image/*" ref={scoutInputRef} onChange={handleScoutImageUpload} style={{ display: 'none' }} />
                  <button onClick={() => scoutInputRef.current.click()} disabled={isTyping} style={{ width: '100%', backgroundColor: '#f43f5e', color: '#ffffff', border: 'none', padding: '14px', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', borderRadius: '6px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(244,63,94,0.3)' }}>Scansiona e Aggiungi in Shortlist</button>
                  
                  <div style={{ marginTop: '15px', backgroundColor: '#140f24', padding: '14px', borderRadius: '8px', border: '1px solid #231b3a' }}>
                    <span style={{ fontSize: '11px', color: '#f43f5e', fontWeight: 'bold', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>🎯 Obiettivi Inseriti (Shortlist):</span>
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
                  <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#fbbf24', borderBottom: '2px solid #231b3a', paddingBottom: '8px', margin: 0, fontWeight: '900' }}>Direzione Sportiva</h3>
                  <div style={{ backgroundColor: '#140f24', border: '2px solid #231b3a', padding: '16px', borderRadius: '6px', fontSize: '14px', lineHeight: '1.6', color: '#ffffff' }}>
                    <span style={{ color: '#fbbf24', fontWeight: 'bold', display: 'block', marginBottom: '8px', textTransform: 'uppercase', fontSize: '12px' }}>🧹 Epurazione Rosa:</span>
                    Scrivi la tattica che vuoi usare (es. "4-3-3 Gegenpress"). Il DS valuterà la rosa e ti dirà chi sono gli esuberi da vendere basandosi sulla Media Voto.
                  </div>
                  <textarea value={dsTacticInput} onChange={(e) => setDsTacticInput(e.target.value)} placeholder="Inserisci il modulo..." style={{ width: '94%', height: '80px', backgroundColor: '#090710', border: '2px solid #231b3a', padding: '12px', color: '#ffffff', fontSize: '14px', resize: 'none', borderRadius: '6px', marginTop: '10px' }} />
                  <button onClick={handleAnalyzeSquadEsuberi} disabled={isTyping} style={{ backgroundColor: '#fbbf24', color: '#0f0b1b', border: 'none', padding: '14px', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', borderRadius: '6px', cursor: 'pointer', width: '100%', boxShadow: '0 4px 12px rgba(251,191,36,0.2)' }}>Analizza Esuberi</button>
                </>
              )}

              {activeRoom === 'cfo' && (
                <>
                  <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#10b981', borderBottom: '2px solid #231b3a', paddingBottom: '8px', margin: 0, fontWeight: '900' }}>Contabilità Moneyball</h3>
                  <div style={{ backgroundColor: '#140f24', border: '1px solid #231b3a', padding: '14px', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <input type="file" accept="image/*" ref={financeInputRef} onChange={handleFinanceImageUpload} style={{ display: 'none' }} />
                    <button onClick={() => financeInputRef.current.click()} disabled={isTyping} style={{ width: '100%', backgroundColor: '#10b981', color: '#0f0c1b', border: 'none', padding: '12px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer', borderRadius: '4px' }}>Carica Screen Finanze</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                    <div><label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold' }}>Bilancio Societario (€)</label><input type="number" value={finances?.balance || 0} onChange={(e) => updateFinancesCloud('balance', e.target.value)} style={{ width: '92%', backgroundColor: '#090710', border: '2px solid #231b3a', padding: '8px', color: '#10b981', fontWeight: 'bold', borderRadius: '4px' }} /></div>
                    <div><label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold' }}>Budget Mercato (€)</label><input type="number" value={finances?.transfer_budget || 0} onChange={(e) => updateFinancesCloud('transfer_budget', e.target.value)} style={{ width: '92%', backgroundColor: '#090710', border: '2px solid #231b3a', padding: '8px', color: '#fff', borderRadius: '4px' }} /></div>
                  </div>
                  <div style={{ backgroundColor: '#140f24', border: '1px solid #231b3a', padding: '14px', borderRadius: '6px', marginTop: '12px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#fff', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>📊 Simulatore di Ammortamento</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input type="number" value={simCost} onChange={(e) => setSimCost(e.target.value)} placeholder="Costo" style={{ width: '45%', backgroundColor: '#090710', border: '1px solid #231b3a', padding: '6px', color: '#fff', fontSize: '12px', borderRadius: '4px' }} />
                      <input type="number" value={simWage} onChange={(e) => setSimWage(e.target.value)} placeholder="Stip." style={{ width: '45%', backgroundColor: '#090710', border: '1px solid #231b3a', padding: '6px', color: '#fff', fontSize: '12px', borderRadius: '4px' }} />
                    </div>
                    <button onClick={handleSimulateTransfer} style={{ backgroundColor: '#10b981', color: '#0f0c1b', border: 'none', padding: '8px', fontSize: '11px', fontWeight: 'bold', borderRadius: '4px', marginTop: '10px', width: '100%', cursor: 'pointer' }}>Calcola Impatto</button>
                    {simResult && <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#090710', borderLeft: `3px solid ${simResult.color}`, fontSize: '12px', color: '#fff' }}>{simResult.notes}</div>}
                  </div>
                  <button onClick={handleFinanceAudit} disabled={isTyping} style={{ backgroundColor: '#da1b60', color: '#fff', border: 'none', padding: '12px', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', borderRadius: '6px', marginTop: '12px', width: '100%', cursor: 'pointer' }}>Genera Audit Contabile</button>
                </>
              )}

              {activeRoom === 'press' && (
                <>
                  <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#ec4899', borderBottom: '2px solid #231b3a', paddingBottom: '8px', margin: 0, fontWeight: '900' }}>Hub Carattere Mister</h3>
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
                      <label style={{ fontSize: '11px', color: '#ec4899', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>🎙️ Stile di Risposta (Media Style):</label>
                      <select value={pressStyle} onChange={(e) => setPressStyle(e.target.value)} style={{ width: '100%', backgroundColor: '#090710', border: '2px solid #231b3a', padding: '8px', color: '#fff', fontSize: '13px', borderRadius: '4px' }}>
                        <option value="diplomatic">Istituzionale / Calmo</option>
                        <option value="sardonic">Ironico / Sardonico (Frecciatine)</option>
                        <option value="explosive">Furente / Schietto (Fuoco e Fiamme)</option>
                        <option value="silent">Silenzio Stampa Tattico</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: '#ec4899', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>🛡️ Gestione Spogliatoio:</label>
                      <select value={squadShield} onChange={(e) => setSquadShield(e.target.value)} style={{ width: '100%', backgroundColor: '#090710', border: '2px solid #231b3a', padding: '8px', color: '#fff', fontSize: '13px', borderRadius: '4px' }}>
                        <option value="shield_total">Scudo Totale (La colpa è mia)</option>
                        <option value="carot_stick">Bastone e Carota (Equilibrato)</option>
                        <option value="public_audit">Strigliata Pubblica (Tribuna a chi sbaglia)</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: '#ec4899', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>🥊 Atteggiamento con i Rivali:</label>
                      <select value={rivalRelation} onChange={(e) => setRivalRelation(e.target.value)} style={{ width: '100%', backgroundColor: '#090710', border: '2px solid #231b3a', padding: '8px', color: '#fff', fontSize: '13px', borderRadius: '4px' }}>
                        <option value="provocative">Provocatore Nato (Mind Games)</option>
                        <option value="respectful">Signorile / Fair-play</option>
                        <option value="indifferent">Totale Indifferenza</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: '#ec4899', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>📐 Identità di Campo:</label>
                      <select value={tacticalFocus} onChange={(e) => setTacticalFocus(e.target.value)} style={{ width: '100%', backgroundColor: '#090710', border: '2px solid #231b3a', padding: '8px', color: '#fff', fontSize: '13px', borderRadius: '4px' }}>
                        <option value="purist">Bel Gioco Purista (Zemaniano)</option>
                        <option value="pragmatic">Risultatista (Corto Muso / 1-0)</option>
                        <option value="nerd">Algoritmico (xG Nerd)</option>
                      </select>
                    </div>
                  </div>
                  <input type="file" accept="image/*" ref={pressInputRef} onChange={handlePressImageUpload} style={{ display: 'none' }} />
                  <button onClick={() => pressInputRef.current.click()} disabled={isTyping} style={{ width: '100%', backgroundColor: '#ec4899', color: '#fff', border: 'none', padding: '14px', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', borderRadius: '6px', cursor: 'pointer', marginTop: '12px' }}>Carica Screenshot Conferenza</button>
                </>
              )}

              {activeRoom === 'youth' && (
                <>
                  <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#ffaa00', borderBottom: '2px solid #231b3a', paddingBottom: '8px', margin: 0, fontWeight: '900' }}>Vivaio Under 20</h3>
                  <input type="file" accept="image/*" ref={youthInputRef} onChange={handleYouthImageUpload} style={{ display: 'none' }} />
                  <button onClick={() => youthInputRef.current.click()} disabled={isTyping} style={{ width: '100%', backgroundColor: '#ffaa00', color: '#0f0c1b', border: 'none', padding: '12px', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', borderRadius: '6px', cursor: 'pointer' }}>Carica Screen Profilo Giovane</button>
                </>
              )}

              {activeRoom === 'analyst' && (
                <>
                  <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#3b82f6', borderBottom: '2px solid #231b3a', paddingBottom: '8px', margin: 0, fontWeight: '900' }}>Match Analysis Center</h3>
                  <input type="file" accept="image/*" ref={analystInputRef} onChange={handleAnalystImageUpload} style={{ display: 'none' }} />
                  <button onClick={() => analystInputRef.current.click()} disabled={isTyping} style={{ width: '100%', backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '12px', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', borderRadius: '6px', cursor: 'pointer' }}>Carica Tabellino Gara</button>
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
            <input type="file" accept="image/*" multiple ref={fileInputRef} onChange={handleImageUploadOCR} style={{ display: 'none' }} />
            
            {!isMobile && safePlayers.length > 0 && (
              <button onClick={handleForceSync} disabled={isUploading} style={{ backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '10px 16px', fontSize: '12px', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer' }}>{isUploading ? 'Sincro...' : '☁️ Forza Sincro Cloud'}</button>
            )}

            <button onClick={() => fileInputRef.current.click()} disabled={isUploading} style={{ backgroundColor: isUploading ? '#fbbf24' : '#da1b60', color: isUploading ? '#0f0c1b' : '#fff', border: 'none', padding: '10px 20px', fontSize: '12px', fontWeight: 'bold', borderRadius: '6px', cursor: isUploading ? 'not-allowed' : 'pointer' }}>
              {isUploading ? '⏳ SCANSIONE...' : 'Carica Foto Rosa (Multiplo)'}
            </button>
            {safePlayers.length > 0 && <button onClick={handleClearAllData} style={{ backgroundColor: 'transparent', border: '2px solid #ef4444', color: '#ef4444', padding: '10px 16px', fontSize: '12px', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer' }}>Azzera</button>}
          </div>
        </div>

        <div style={{ flex: 1, padding: isMobile ? '12px' : '24px', overflowY: 'auto', backgroundColor: '#090710', width: '100%', boxSizing: 'border-box' }}>
          
          {isUploading && (dbSubTab === 'first_team' || dbSubTab === 'youth') ? (
            <div style={{ textAlign: 'center', padding: '64px', color: '#fbbf24', fontSize: '16px', fontWeight: 'bold', border: '2px dashed #fbbf24', backgroundColor: '#140f24', borderRadius: '8px' }}>
              {uploadProgressText}
            </div>
          ) : dbSubTab === 'shortlist' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {safeShortlist.length === 0 ? <div style={{ color: '#475569', textAlign: 'center', padding: '40px' }}>Lista desideri vuota. Il Vice la aggiornerà appena valuterà i tuoi screen di mercato.</div> : safeShortlist.map((s, i) => (
                <div key={s?.id || i} style={{ backgroundColor: '#140f24', border: '2px solid #f43f5e', padding: '16px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '18px', fontWeight: '900', color: '#fff' }}>{s?.name || 'Sconosciuto'}</span>
                    <span style={{ backgroundColor: '#f43f5e', color: '#fff', fontSize: '11px', padding: '4px 8px', borderRadius: '4px', fontWeight: '900' }}>{s?.verdict || 'VAGLIATO'}</span>
                  </div>
                  <div style={{ color: '#22d3ee', fontSize: '14px', fontWeight: 'bold' }}>Ruolo: {s?.position || 'N/D'}</div>
                  <div style={{ color: '#cbd5e1', fontSize: '14px', whiteSpace: 'pre-line', marginTop: '6px' }}>{s?.analysis || ''}</div>
                </div>
              ))}
            </div>
          ) : dbSubTab === 'matches' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {safeMatches.length === 0 ? <div style={{ color: '#475569', textAlign: 'center', padding: '40px' }}>Nessuna partita a referto. Manda gli screen del Data Hub in chat per archiviarle.</div> : safeMatches.map((m, i) => (
                <div key={m?.id || i} style={{ backgroundColor: '#140f24', border: '2px solid #3b82f6', padding: '16px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '18px', fontWeight: '900', color: '#fff' }}>SORA vs {m?.opponent?.toUpperCase() || 'SQUADRA AVV.'}</span>
                    <span style={{ backgroundColor: '#3b82f6', color: '#fff', fontSize: '14px', padding: '4px 10px', borderRadius: '4px', fontWeight: '900' }}>{m?.result || 'N/D'}</span>
                  </div>
                  <div style={{ color: '#34d399', fontSize: '13px', fontWeight: 'bold' }}>Metriche: xG {m?.xg_team || '-'} - {m?.xg_opp || '-'} xG Subiti</div>
                  <div style={{ color: '#cbd5e1', fontSize: '14px', whiteSpace: 'pre-line', marginTop: '6px' }}>{m?.analysis || ''}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ backgroundColor: '#140f24', border: '2px solid #231b3a', borderRadius: '8px', overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
              {sortedList.length === 0 ? <div style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>Nessun calciatore in archivio.</div> : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#1d1733', borderBottom: '3px solid #090710' }}>
                      <th onClick={() => handleSort('name')} style={{ padding: '12px 10px', color: '#ffffff', cursor: 'pointer', fontWeight: '900' }}>Nome</th>
                      <th onClick={() => handleSort('position')} style={{ padding: '12px 10px', color: '#ffffff', cursor: 'pointer', fontWeight: '900' }}>Ruolo</th>
                      <th onClick={() => handleSort('age')} style={{ padding: '12px 10px', color: '#ffffff', cursor: 'pointer', textAlign: 'center', fontWeight: '900' }}>Età</th>
                      <th onClick={() => handleSort('pres')} style={{ padding: '12px 10px', color: '#ffffff', cursor: 'pointer', textAlign: 'center', fontWeight: '900' }}>Pres</th>
                      <th onClick={() => handleSort('gol')} style={{ padding: '12px 10px', color: '#ffffff', cursor: 'pointer', textAlign: 'center', fontWeight: '900' }}>Gol</th>
                      <th onClick={() => handleSort('mv')} style={{ padding: '12px 10px', color: '#ffffff', cursor: 'pointer', textAlign: 'center', fontWeight: '900' }}>M.V.</th>
                      <th style={{ padding: '12px 10px', width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedList.map((p, idx) => {
                      const mv = parseFloat(String(p?.attributes?.['Media Voto'] || '0').replace(',', '.'));
                      const mvColor = mv < 6.70 ? '#ef4444' : (mv > 7.10 ? '#34d399' : '#ffffff');
                      return (
                        <tr key={p?.id || idx} onClick={(e) => handleSelectPlayer(p, e)} style={{ borderBottom: '1px solid #231b3a', cursor: 'pointer', backgroundColor: selectedProfile?.id === p?.id ? '#271e44' : 'transparent' }}>
                          <td style={{ padding: '14px 10px', fontWeight: 'bold', color: '#ffffff', fontSize: '15px' }}>{p?.name || '-'} {p?.notes && <span style={{ fontSize: '10px', backgroundColor: '#a855f7', padding: '2px 4px', borderRadius: '3px', marginLeft: '4px' }}>FASCICOLO</span>}</td>
                          <td style={{ padding: '14px 10px', color: '#22d3ee', fontWeight: '700' }}>{p?.position || 'N/D'}</td>
                          <td style={{ padding: '14px 10px', textAlign: 'center', color: '#fff' }}>{p?.age || '-'}</td>
                          <td style={{ padding: '14px 10px', textAlign: 'center', color: '#cbd5e1' }}>{p?.attributes?.Presenze || '-'}</td>
                          <td style={{ padding: '14px 10px', textAlign: 'center', color: '#ffffff', fontWeight: 'bold' }}>{p?.attributes?.Gol || '-'}</td>
                          <td style={{ padding: '14px 10px', textAlign: 'center', color: mvColor, fontWeight: 'bold' }}>{p?.attributes?.['Media Voto'] || '-'}</td>
                          <td style={{ padding: '14px 10px', textAlign: 'center' }}>
                            <button onClick={(e) => { e.stopPropagation(); handleDeletePlayer(p.id); }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }} title="Elimina Calciatore">
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 12. STRUTTURA PRINCIPALE E FLYOUT MODALI
  const navContainerStyle = isMobile ? {
    position: 'fixed', bottom: 0, left: 0, right: 0, height: '70px', width: '100%',
    backgroundColor: '#140f24', borderTop: '2px solid #231b3a', display: 'flex',
    flexDirection: 'row', alignItems: 'center', padding: '0 10px', gap: '14px', overflowX: 'auto', zIndex: 1000
  } : {
    width: '90px', backgroundColor: '#140f24', borderRight: '2px solid #231b3a',
    display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '20px', gap: '16px', zIndex: 10
  };

  const navButtonStyle = (room, color) => ({
    background: activeRoom === room ? '#271e44' : 'none',
    border: activeRoom === room ? `2px solid ${color}` : '2px solid transparent',
    color: activeRoom === room ? color : '#475569', padding: '10px', borderRadius: '10px', cursor: 'pointer', flexShrink: 0
  });

  return (
    <div style={{ display: 'flex', height: '100vh', flexDirection: isMobile ? 'column' : 'row', backgroundColor: '#090710', color: '#cbd5e1', fontFamily: 'system-ui, -apple-system, sans-serif', overflow: 'hidden' }}>
      
      {/* BARRA NAVIGAZIONE VERTICALE / ORIZZONTALE (SEMPLIFICATA) */}
      <div style={navContainerStyle}>
        {!isMobile && <div style={{ width: '52px', height: '52px', backgroundColor: '#da1b60', display: 'flex', alignItems: 'center', color: '#fff', fontWeight: '900', fontSize: '22px', borderRadius: '10px', justifyContent: 'center' }}>FM</div>}
        <button onClick={() => handleSidebarClick('board')} style={navButtonStyle('board', '#a855f7')} title="Direzione e Progetto"><Users size={22} /></button>
        <button onClick={() => handleSidebarClick('vice')} style={navButtonStyle('vice', '#22d3ee')} title="Vice Tuttofare"><Sliders size={22} /></button>
        {!isMobile && <div style={{ width: '44px', height: '2px', backgroundColor: '#231b3a', margin: '6px 0' }}></div>}
        <button onClick={() => handleSidebarClick('database')} style={navButtonStyle('database', '#da1b60')} title="Database Squadra"><Database size={22} /></button>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingBottom: isMobile ? '70px' : '0px' }}>
        {activeRoom !== 'database' && renderChatWindow()}
        {activeRoom === 'database' && renderMasterDatabase()}
      </div>

      {/* FLYOUT: FASCICOLO CALCIATORE E NOTE EDITABILI */}
      {selectedProfile && (
        <div style={{ position: 'fixed', right: isMobile ? '10px' : '25px', bottom: isMobile ? '80px' : '25px', left: isMobile ? '10px' : 'auto', width: isMobile ? 'calc(100% - 20px)' : '340px', backgroundColor: '#140f24', border: '3px solid #da1b60', padding: '16px', borderRadius: '12px', boxShadow: '0 30px 60px rgba(0,0,0,0.9)', zIndex: 5000, boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #231b3a', paddingBottom: '10px', marginBottom: '12px', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '10px', color: '#da1b60', fontWeight: '900' }}>FASCICOLO CALCIATORE</span>
              <h4 style={{ fontSize: '18px', color: '#ffffff', margin: '2px 0 0 0', fontWeight: '900' }}>{selectedProfile?.name || '-'}</h4>
            </div>
            <button onClick={() => setSelectedProfile(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', padding: '8px 12px', backgroundColor: '#090710', borderRadius: '6px' }}>
              <span style={{ color: '#94a3b8' }}>Ruolo</span>
              <span style={{ color: '#22d3ee', fontWeight: '900' }}>{selectedProfile?.position || 'N/D'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', padding: '8px 12px', backgroundColor: '#090710', borderRadius: '6px' }}>
              <span style={{ color: '#94a3b8' }}>Età</span>
              <span style={{ color: '#ffffff', fontWeight: '900' }}>{selectedProfile?.age || 'N/D'}</span>
            </div>
            
            {/* ELENCO DINAMICO DI TUTTI GLI ATTRIBUTI TROVATI */}
            {selectedProfile?.attributes && Object.entries(selectedProfile.attributes).map(([key, val]) => {
               const numVal = parseInt(val);
               let valColor = '#34d399'; 
               if (!isNaN(numVal)) {
                 if (numVal < 10) valColor = '#ef4444';
                 else if (numVal >= 15) valColor = '#22d3ee';
               }
               return (
                 <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '6px 12px', backgroundColor: '#090710', borderRadius: '4px', borderBottom: '1px solid #140f24' }}>
                   <span style={{ color: '#cbd5e1' }}>{key}</span>
                   <span style={{ color: valColor, fontWeight: '900' }}>{String(val)}</span>
                 </div>
               );
            })}
            
            <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', color: '#a855f7', fontWeight: 'bold', textTransform: 'uppercase' }}>✍️ Note del Mister:</label>
              <textarea value={editingNotes} onChange={(e) => setEditingNotes(e.target.value)} placeholder="Inserisci focus allenamento, infortuni o note di campo..." style={{ width: '92%', height: '80px', backgroundColor: '#090710', border: '1px solid #231b3a', padding: '8px', color: '#fff', fontSize: '14px', borderRadius: '6px', resize: 'none' }} />
              <button onClick={handleSavePlayerNotes} disabled={isSavingNotes} style={{ backgroundColor: '#a855f7', color: '#fff', border: 'none', padding: '10px', fontSize: '12px', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer', textTransform: 'uppercase' }}>{isSavingNotes ? 'Sincronizzazione...' : 'Salva Note'}</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default App
