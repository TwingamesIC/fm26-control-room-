import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient'
import { MessageSquare, Database, Settings, Send, Users, Sliders, TrendingUp, ImageIcon, X, CloudOff, Briefcase, ChevronRight, HelpCircle, Award, Activity, Search, Trash2 } from 'lucide-react'
import { GoogleGenerativeAI } from '@google/generative-ai'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

function App() {
  // 1. STATI DI NAVIGAZIONE E LAYOUT
  const [activeRoom, setActiveRoom] = useState('board') 
  const [dbSubTab, setDbSubTab] = useState('first_team') 
  const [sortField, setSortField] = useState('name')
  const [sortDirection, setSortDirection] = useState('asc')
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  const [mobileViewTab, setMobileViewTab] = useState('chat')

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // 2. STATI DEI DATI SOCIETARI CON INIZIALIZZAZIONE ULTRA-SICURA
  const [clubName, setClubName] = useState(() => localStorage.getItem('hq_club_name') || 'Sora')
  const [players, setPlayers] = useState(() => { try { return JSON.parse(localStorage.getItem('hq_players')) || []; } catch(e) { return []; } })
  const [shortlist, setShortlist] = useState(() => { try { return JSON.parse(localStorage.getItem('hq_shortlist')) || []; } catch(e) { return []; } })
  const [matches, setMatches] = useState(() => { try { return JSON.parse(localStorage.getItem('hq_matches')) || []; } catch(e) { return []; } })
  const [messages, setMessages] = useState(() => { try { return JSON.parse(localStorage.getItem('hq_messages')) || [{ sender_role: 'system', content: 'Centrale operativa allineata. Il traduttore grafico è attivo.' }]; } catch(e) { return [{ sender_role: 'system', content: 'Centrale operativa allineata.' }]; } })
  const [tacticReports, setTacticReports] = useState(() => { try { return JSON.parse(localStorage.getItem('hq_tactic_reports')) || []; } catch(e) { return []; } })
  const [finances, setFinances] = useState(() => { try { return JSON.parse(localStorage.getItem('hq_finances')) || { balance: 2500000, transfer_budget: 800000, wage_budget: 15000 }; } catch(e) { return { balance: 2500000, transfer_budget: 800000, wage_budget: 15000 }; } })

  // 3. STATI DEL CARATTERE E PERSONALITÀ MISTER
  const [personality, setPersonality] = useState(() => localStorage.getItem('hq_coach_personality') || 'professional')
  const [pressStyle, setPressStyle] = useState(() => localStorage.getItem('hq_press_style') || 'diplomatic')
  const [squadShield, setSquadShield] = useState(() => localStorage.getItem('hq_squad_shield') || 'shield_total')
  const [rivalRelation, setRivalRelation] = useState(() => localStorage.getItem('hq_rival_relation') || 'respectful')
  const [tacticalFocus, setTacticalFocus] = useState(() => localStorage.getItem('hq_tactical_focus') || 'pragmatic')

  // 4. STATI DEGLI STRUMENTI, INPUT E INTERFACCIA
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

  // REF PER GLI INPUT FILE
  const fileInputRef = useRef(null)
  const pressInputRef = useRef(null)
  const youthInputRef = useRef(null)
  const financeInputRef = useRef(null)
  const analystInputRef = useRef(null)
  const scoutInputRef = useRef(null)
  const vicePreMatchRef = useRef(null)
  const viceTacticInputRef = useRef(null)
  const chatImageInputRef = useRef(null) // NUOVO REF PER L'UPLOAD IMMAGINI GENERICO IN CHAT
  const chatContainerRef = useRef(null)

  // 5. SALVATAGGIO LOCALE AUTOMATICO E SCROLL
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

  // 6. TRADUTTORE GRAFICO PER LA CHAT
  const formatMessageContent = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, index) => {
      let isList = line.trim().startsWith('* ');
      let isHeader = line.trim().startsWith('### ');
      let isSubHeader = line.trim().startsWith('## ');
      
      let cleanLine = line;
      if (isList) cleanLine = line.replace('* ', '').trim();
      if (isHeader) cleanLine = line.replace('### ', '').trim();
      if (isSubHeader) cleanLine = line.replace('## ', '').trim();
      
      const parts = cleanLine.split(/(\*\*.*?\*\*)/g);
      const renderedParts = parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} style={{ color: '#22d3ee', fontWeight: '900' }}>{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
      });

      if (isHeader || isSubHeader) {
        return <div key={index} style={{ marginTop: '14px', marginBottom: '8px', fontSize: '1.1em', fontWeight: '900', color: '#a855f7', borderBottom: '1px solid #231b3a', paddingBottom: '4px' }}>{renderedParts}</div>;
      }

      if (isList) {
        return (
          <div key={index} style={{ display: 'flex', gap: '8px', marginTop: '6px', paddingLeft: '12px' }}>
            <span style={{ color: '#da1b60', fontWeight: 'bold' }}>•</span>
            <div style={{ flex: 1 }}>{renderedParts}</div>
          </div>
        );
      }
      return <div key={index} style={{ marginTop: '4px', minHeight: '14px' }}>{renderedParts}</div>;
    });
  };

  // 7. FUNZIONI DI RETE SUPABASE
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
      setMessages([{ sender_role: 'system', content: 'Centrale resettata con successo. Sede pulita.' }]);
      setFinances({ balance: 2500000, transfer_budget: 800000, wage_budget: 15000 }); 
      setSelectedProfile(null); localStorage.clear();
      try { await supabase.from('players').delete().neq('id', 0); await supabase.from('shortlist').delete().neq('id', 0); await supabase.from('matches').delete().neq('id', 0); await supabase.from('club_messages').delete().neq('id', 0); } catch(e) {}
    }
  };

  // 8. AZIONI UTENTE
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
    if (cost > finances.transfer_budget) { status = 'BLOCCATO'; color = '#ef4444'; notes = `Fondi insufficienti nel budget trasferimenti.`; }
    else if (weeklyWage > (finances.wage_budget * 0.3)) { status = 'RISCHIO SPOGLIATOIO'; color = '#ffaa00'; notes = `L'ingaggio supera il 30% del tetto salariale.`; }
    setSimResult({ status, color, annualAmortization, annualWageCost, notes });
  };

  const handleSort = (field) => {
    if (sortField === field) { setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc'); } 
    else { setSortField(field); setSortDirection('asc'); }
  };

  // 9. CORE AI CHAT & UPLOAD GLOBALE FOTO
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
        SEI LO STAFF REALE E PASSIONALE DEL CLUB "${clubName.toUpperCase()}" SU FOOTBALL MANAGER 2026.
        Il tuo Mister (Omiserez) ti dice: "${currentInputText}"
        
        ⚠️ PARAMETRI IDENTITÀ CARATTERIALE DEL MISTER:
        - Stile Media: ${pressStyle.toUpperCase()} | Protezione Spogliatoio: ${squadShield.toUpperCase()}
        - Rapporto Rivali: ${rivalRelation.toUpperCase()} | Fede Tattica: ${tacticalFocus.toUpperCase()}

        REGOLE INTERNE CARATTERE DELLO STAFF (VIETATO COMPORTARSI DA BOT):
        - VICE ALLENATORE: Uomo di campo, sanguigno, difende lo spogliatoio. Forma le liste in modo leggibile.
        - DIRETTORE SPORTIVO: Cinico, pensa a soldi, esuberi, plusvalenze e agenti.
        - CHIEF SCOUT: Fissato con i wonderkids esteri.
        - CFO FINANZE: Tirchio, ironizza sempre sui soldi spesi.
        - ADDETTO STAMPA: Pettegolo sui giornalisti.
        - RESPONSABILE GIOVANILI: Paterno con i giovani under 20.
        - MATCH ANALYST: Nerd dei dati e dei grafici xG.

        FORMATTAZIONE OBBLIGATORIA: Quando fai un elenco usa sempre i pallini (inizia la riga con asterisco e spazio '* '). Evita di scrivere blocchi di testo illeggibili.

        CRONOLOGIA:
        ${businessChronology}
        
        SITUAZIONE:
        - Cassa €${finances?.balance || 0}
        - ROSA SORA: ${JSON.stringify(squadContext.slice(0, 30))}
        - OBIETTIVI: ${JSON.stringify(shortlistContext)}
        - GARE: ${JSON.stringify(matchesContext)}
      `;

      if (activeRoom === 'board') { instructionPrompt += `\nREGOLE TAVOLO PLENARIA: Rispondi simulando un dibattito acceso.`; } 
      else { instructionPrompt += `\nSTANZA SINGOLA ATTIVA: SEI NELL'UFFICIO PRIVATO DI '${activeRoom.toUpperCase()}'. Rispondi al Mister interpretando esclusivamente il tuo personaggio.`; }

      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(instructionPrompt);
      const aiMessageObj = { sender_role: activeRoom, content: result.response.text() };
      setMessages(prev => [...prev, aiMessageObj]);
      try { await supabase.from('club_messages').insert([aiMessageObj]); } catch(e) {}
    } catch (error) { console.error(error); } finally { setIsTyping(false); }
  };

  // 📸 NUOVO: GESTIONE UPLOAD IMMAGINI DIRETTAMENTE DALLA CHAT
  const handleChatImageUpload = async (event) => {
    const file = event.target.files[0]; 
    if (!file) return; 
    
    const currentText = chatInput.trim();
    setChatInput('');
    setIsTyping(true); 
    if (isMobile) setMobileViewTab('chat');
    
    try {
      const reader = new FileReader(); 
      reader.onloadend = async () => {
        const imagePart = { inlineData: { data: reader.result.split(',')[1], mimeType: file.type } };
        
        const userRole = `user:${activeRoom}`;
        const displayMsg = currentText ? `📷 [Immagine allegata] ${currentText}` : `📷 [Immagine allegata] Guarda questo screen, cosa ne pensi?`;
        
        const userMessageObj = { sender_role: userRole, content: displayMsg };
        setMessages(prev => [...prev, userMessageObj]);
        try { await supabase.from('club_messages').insert([userMessageObj]); } catch(e) {}

        const safePlayers = Array.isArray(players) ? players : [];
        const squadContext = safePlayers.map(p => ({ nome: p?.name || 'Sconosciuto', ruolo: p?.position || 'N/D', stats: p?.attributes || {} }));

        let instructionPrompt = `
          SEI LO STAFF REALE E PASSIONALE DEL CLUB "${clubName.toUpperCase()}" SU FOOTBALL MANAGER 2026.
          Il Mister ti ha appena allegato un'immagine e ti dice: "${currentText || 'Cosa ne pensi di questo screen?'}"
          
          REGOLE DELLO STAFF: Reagisci all'immagine usando il carattere del tuo ruolo.
          - VICE: Uomo di campo, diretto.
          - DS: Squalo, pensa ai soldi/contratti.
          - SCOUT: Fissato col potenziale.
          - CFO: Tirchio.
          - STAMPA: Pettegolo, ansioso per l'immagine del club.
          - GIOVANILI: Difende gli under 20.
          - ANALYST: Parla solo di algoritmi.
          
          FORMATTAZIONE: Usa elenchi puntati con asterischi per separare i punti.
          ROSA: ${JSON.stringify(squadContext.slice(0, 20))}
        `;

        if (activeRoom === 'board') { instructionPrompt += `\nRispondi simulando un dibattito tra i vari membri dello staff riguardo a questa immagine.`; } 
        else { instructionPrompt += `\nSei nell'ufficio '${activeRoom.toUpperCase()}'. Rispondi al Mister analizzando l'immagine come farebbe il tuo ruolo.`; }

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent([instructionPrompt, imagePart]); 
        const output = result.response.text();
        
        const aiMessageObj = { sender_role: activeRoom, content: output }; 
        setMessages(prev => [...prev, aiMessageObj]);
        try { await supabase.from('club_messages').insert([aiMessageObj]); } catch(e) {}
      }; 
      reader.readAsDataURL(file);
    } catch (err) { 
      console.error(err); 
    } finally { 
      setIsTyping(false); 
      if (chatImageInputRef.current) chatImageInputRef.current.value = ""; 
    }
  };

  // 10. FUNZIONI MULTIMEDIALI STRUMENTI SPECIFICI
  const handlePreMatchAnalysis = async (event) => {
    const file = event.target.files[0]; if (!file) return; setIsTyping(true); if (isMobile) setMobileViewTab('chat');
    try {
      const reader = new FileReader(); reader.onloadend = async () => {
        const imagePart = { inlineData: { data: reader.result.split(',')[1], mimeType: file.type } };
        const safePlayers = Array.isArray(players) ? players : [];
        const squadContext = safePlayers.map(p => ({ nome: p?.name, ruolo: p?.position, stats: p?.attributes }));

        const prompt = `Sei il Vice Allenatore sanguigno del club "${clubName}".
        Questo è lo screenshot della squadra avversaria.
        Nostra rosa: ${JSON.stringify(squadContext.slice(0, 40))}.
        Fai un BRIEFING PRE-PARTITA (usa bene grassetti e liste puntate con asterisco):
        1. Punti deboli avversari.
        2. Formazione titolare nostra ideale da schierare oggi.
        3. Istruzioni individuali per distruggerli.`;

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent([prompt, imagePart]); const output = result.response.text();
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
        const prompt = `Sei il Vice Allenatore verace e sanguigno del club "${clubName}".
        Il Mister ti ha appena mostrato questo screenshot. Analizzalo attentamente. Sii diretto, usa un linguaggio da spogliatoio e formatta bene la tua risposta usando elenchi puntati con l'asterisco se devi elencare problemi o consigli.`;
        
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent([prompt, imagePart]); const output = result.response.text();
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
      const prompt = `Analizza la tattica: """${inputBuffer}""" sulla rosa ${clubName}. Fai un report con liste formattate con asterisco puntato. Inizia con TITOLO: [Nome breve]`;
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(prompt); const outputText = result.response.text();
      const cleanTitle = (outputText.match(/TITOLO:\s*(.*)/i)?.[1] || `Tattica del ${new Date().toLocaleDateString()}`).replace('[', '').replace(']', '').trim();
      const userMsg = { sender_role: `user:vice`, content: `📋 Mister ha inoltrato una nuova tattica esterna per la convalida.` };
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
      const prompt = `Sei il DS del "${clubName}". Tattica richiesta: "${inputBuffer}".
      Rosa: ${JSON.stringify(squadContext.slice(0, 40))}.
      Stila una lista spietata e ben formattata (liste puntate con asterisco) degli ESUBERI da cedere perché inutili.`;
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(prompt); const outputText = result.response.text();
      const userMsg = { sender_role: `user:ds`, content: `📋 Direttore, valuta la rosa per la tattica: "${inputBuffer}". Chi dobbiamo cedere?` };
      const aiMsg = { sender_role: 'ds', content: outputText }; setMessages(prev => [...prev, userMsg, aiMsg]);
      try { await supabase.from('club_messages').insert([userMsg, aiMsg]); } catch(e) {}
    } catch (error) { console.error(error); } finally { setIsTyping(false); }
  };

  const handleScoutImageUpload = async (event) => {
    const file = event.target.files[0]; if (!file) return; setIsTyping(true); if (isMobile) setMobileViewTab('chat');
    try {
      const reader = new FileReader(); reader.onloadend = async () => {
        const imagePart = { inlineData: { data: reader.result.split(',')[1], mimeType: file.type } };
        const prompt = `Sei il Scout del "${clubName}". Schedatura FM26. Output: VERDETTO: [ACQUISTARE, RISERVA, EVITARE] NOME: [Nome] RUOLO: [Ruolo] REPORT: [Analisi formattata]`;
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
        const prompt = `Sei l'Addetto Stampa del "${clubName}". Screen conferenza. Stile Mister: ${pressStyle}. Detta quale pulsante premere per restare nel personaggio, formatta la risposta a punti con asterisco.`;
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
        const prompt = `Sei il Match Analyst del "${clubName}". Compila in chiaro: AVVERSARIO: [Nome] RISULTATO: [Risultato] XG_TEAM: [xG] XG_OPP: [xG] ANALISI: [Analisi nerd]`;
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent([prompt, imagePart]); const output = result.response.text();
        const mOpp = (output.match(/AVVERSARIO:\s*(.*)/i)?.[1] || 'Gara').trim();
        const mRes = (output.match(/RISULTATO:\s*(.*)/i)?.[1] || 'N/D').trim();
        const mXgT = (output.match(/XG_TEAM:\s*(.*)/i)?.[1] || '-').trim();
        const mXgO = (output.match(/XG_OPP:\s*(.*)/i)?.[1] || '-').trim();
        const userMsg = { sender_role: `user:analyst`, content: `📷 Mister ha caricato il tabellino visivo del fine gara.` };
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
        const prompt = `Sei il CFO taccagno del club "${clubName}". Estrai finanze in JSON puro: { "balance": numero, "transfer_budget": numero, "wage_budget": numero, "analysis": "analisi sarcastica" }`;
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent([prompt, imagePart]);
        const cleanText = result.response.text().replace(/```json/gi, '').replace(/```/g, '').trim();
        try {
          const parsed = JSON.parse(cleanText);
          if (parsed) {
            setFinances({ balance: parsed.balance || 0, transfer_budget: parsed.transfer_budget || 0, wage_budget: parsed.wage_budget || 0 });
            const userMsg = { sender_role: `user:cfo`, content: `📷 Mister ha inserito il rendiconto finanziario.` };
            const aiMsg = { sender_role: 'cfo', content: parsed.analysis || "Audit completato." }; setMessages(prev => [...prev, userMsg, aiMsg]);
            try { await supabase.from('club_finances').update({ balance: parsed.balance || 0, transfer_budget: parsed.transfer_budget || 0, wage_budget: parsed.wage_budget || 0 }).eq('id', 1); await supabase.from('club_messages').insert([userMsg, aiMsg]); } catch (e) {}
          }
        } catch (jsonErr) { console.error(jsonErr); }
      }; reader.readAsDataURL(file);
    } catch (e) { console.error(e); } finally { setIsTyping(false); }
  };

  const handleFinanceAudit = async () => {
    setIsTyping(true); if (isMobile) setMobileViewTab('chat');
    try {
      const safePlayers = Array.isArray(players) ? players : [];
      const soraPlayersContext = safePlayers.map(p => ({ nome: p?.name, stipendio: p?.attributes?.Ingaggio || '-' }));
      const prompt = `CFO Club ${clubName}. Redigi audit Moneyball sarcastico: Cassa €${finances?.balance || 0}. Usa elenchi puntati.`;
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(prompt); const auditOutput = result.response.text();
      const userMsg = { sender_role: `user:cfo`, content: `📊 Mister ha richiesto un Audit Contabile.` };
      const aiMsg = { sender_role: 'cfo', content: auditOutput }; setMessages(prev => [...prev, userMsg, aiMsg]);
      try { await supabase.from('club_messages').insert([userMsg, aiMsg]); } catch(e) {}
    } catch (e) { console.error(e); } finally { setIsTyping(false); }
  };

  const handleYouthImageUpload = async (event) => {
    const file = event.target.files[0]; if (!file) return; setIsTyping(true); if (isMobile) setMobileViewTab('chat');
    try {
      const reader = new FileReader(); reader.onloadend = async () => {
        const imagePart = { inlineData: { data: reader.result.split(',')[1], mimeType: file.type } };
        const prompt = `Sei il Resp. Giovanili del "${clubName}". Valuta il wonderkid in modo entusiasta.`;
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent([prompt, imagePart]); const output = result.response.text();
        const userMsg = { sender_role: `user:youth`, content: `📷 Mister ha scansionato il cartellino di un giovane.` };
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
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#0d0a16', width: '100%', height: '100%' }}>
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

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', flexDirection: isMobile ? 'column' : 'row' }}>
          {(!isMobile || mobileViewTab === 'chat') && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', borderRight: isMobile ? 'none' : '2px solid #231b3a', backgroundColor: '#090710' }}>
              <div ref={chatContainerRef} style={{ flex: 1, padding: isMobile ? '16px' : '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                    <div style={{ padding: '14px', fontSize: '15px', backgroundColor: '#140f24', color: '#64748b', borderLeft: '4px solid #475569', borderRadius: '6px', fontStyle: 'italic' }}>Lo specialista sta scrivendo...</div>
                  </div>
                )}
              </div>

              {/* 📸 LA NUOVA BARRA DELLA CHAT CON ALLEGATI */}
              <div style={{ padding: '20px', backgroundColor: '#140f24', borderTop: '2px solid #231b3a', boxShadow: '0 -4px 15px rgba(0,0,0,0.3)' }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <ChevronRight style={{ position: 'absolute', left: '14px', color: '#da1b60' }} size={20} />
                  
                  <input type="file" accept="image/*" ref={chatImageInputRef} onChange={handleChatImageUpload} style={{ display: 'none' }} />
                  
                  <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder={`Scrivi in chat o allega una foto...`} style={{ width: '100%', backgroundColor: '#090710', border: '2px solid #231b3a', padding: '16px 90px 16px 42px', fontSize: '16px', color: '#ffffff', borderRadius: '8px', outline: 'none', fontWeight: '500' }} />
                  
                  <div style={{ position: 'absolute', right: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button onClick={() => chatImageInputRef.current.click()} disabled={isTyping} style={{ background: 'none', border: 'none', color: '#a855f7', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }} title="Allega Screen e Invia">
                      <ImageIcon size={22} />
                    </button>
                    <button onClick={handleSendMessage} disabled={isTyping} style={{ background: 'none', border: 'none', color: '#da1b60', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }} title="Invia Testo">
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
                  <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#a855f7', borderBottom: '2px solid #231b3a', paddingBottom: '8px', margin: 0, fontWeight: '900' }}>Identità Societaria Sora</h3>
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

                  <textarea value={externalTacticInput} onChange={(e) => setExternalTacticInput(e.target.value)} placeholder="Incolla l'analisi della tattica o il link esterno (es. FMScout)..." style={{ width: '94%', height: '140px', backgroundColor: '#090710', border: '2px solid #231b3a', padding: '12px', color: '#ffffff', fontSize: '15px', resize: 'none', borderRadius: '6px', marginTop: '10px' }} />
                  <button onClick={handleAnalyzeExternalTactic} disabled={isTyping} style={{ backgroundColor: '#22d3ee', color: '#0f0b1b', border: 'none', padding: '14px', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', borderRadius: '6px', cursor: 'pointer', width: '100%', boxShadow: '0 4px 12px rgba(34,211,238,0.2)' }}>Avvia Convalida Modulo</button>
                  
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
                    Scrivi la tattica che vuoi usare (es. "4-3-3 Gegenpress"). Il DS valuterà la rosa e ti dirà chi sono gli esuberi da vendere.
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
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUploadOCR} style={{ display: 'none' }} />
            
            {!isMobile && safePlayers.length > 0 && (
              <button onClick={handleForceSync} disabled={isUploading} style={{ backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '10px 16px', fontSize: '12px', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer' }}>{isUploading ? 'Sincro...' : '☁️ Forza Sincro Cloud'}</button>
            )}

            <button onClick={() => fileInputRef.current.click()} disabled={isUploading} style={{ backgroundColor: isUploading ? '#fbbf24' : '#da1b60', color: isUploading ? '#0f0c1b' : '#fff', border: 'none', padding: '10px 20px', fontSize: '12px', fontWeight: 'bold', borderRadius: '6px', cursor: isUploading ? 'not-allowed' : 'pointer' }}>
              {isUploading ? '⏳ SCANSIONE...' : 'Carica Foto Rosa'}
            </button>
            {safePlayers.length > 0 && <button onClick={handleClearAllData} style={{ backgroundColor: 'transparent', border: '2px solid #ef4444', color: '#ef4444', padding: '10px 16px', fontSize: '12px', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer' }}>Azzera</button>}
          </div>
        </div>

        <div style={{ flex: 1, padding: isMobile ? '12px' : '24px', overflowY: 'auto', backgroundColor: '#090710', width: '100%', boxSizing: 'border-box' }}>
          
          {isUploading && (dbSubTab === 'first_team' || dbSubTab === 'youth') ? (
            <div style={{ textAlign: 'center', padding: '64px', color: '#fbbf24', fontSize: '16px', fontWeight: 'bold', border: '2px dashed #fbbf24', backgroundColor: '#140f24', borderRadius: '8px' }}>
              ⏳ Lettura Ottica in corso... Estrazione attributi tattici e valori. Non ricaricare la pagina!
            </div>
          ) : dbSubTab === 'shortlist' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {safeShortlist.length === 0 ? <div style={{ color: '#475569', textAlign: 'center', padding: '40px' }}>Lista desideri vuota. Carica un profilo dall'Ufficio Scout.</div> : safeShortlist.map((s, i) => (
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
              {safeMatches.length === 0 ? <div style={{ color: '#475569', textAlign: 'center', padding: '40px' }}>Nessuna partita a referto. Carica un tabellino dall'Ufficio Analyst.</div> : safeMatches.map((m, i) => (
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
                    {sortedList.map((p, idx) => (
                      <tr key={p?.id || idx} onClick={(e) => handleSelectPlayer(p, e)} style={{ borderBottom: '1px solid #231b3a', cursor: 'pointer', backgroundColor: selectedProfile?.id === p?.id ? '#271e44' : 'transparent' }}>
                        <td style={{ padding: '14px 10px', fontWeight: 'bold', color: '#ffffff', fontSize: '15px' }}>{p?.name || '-'} {p?.notes && <span style={{ fontSize: '10px', backgroundColor: '#a855f7', padding: '2px 4px', borderRadius: '3px', marginLeft: '4px' }}>FASCICOLO</span>}</td>
                        <td style={{ padding: '14px 10px', color: '#22d3ee', fontWeight: '700' }}>{p?.position || 'N/D'}</td>
                        <td style={{ padding: '14px 10px', textAlign: 'center', color: '#fff' }}>{p?.age || '-'}</td>
                        <td style={{ padding: '14px 10px', textAlign: 'center', color: '#cbd5e1' }}>{p?.attributes?.Presenze || '-'}</td>
                        <td style={{ padding: '14px 10px', textAlign: 'center', color: '#ffffff', fontWeight: 'bold' }}>{p?.attributes?.Gol || '-'}</td>
                        <td style={{ padding: '14px 10px', textAlign: 'center', color: '#34d399', fontWeight: 'bold' }}>{p?.attributes?.['Media Voto'] || '-'}</td>
                        <td style={{ padding: '14px 10px', textAlign: 'center' }}>
                          <button onClick={(e) => { e.stopPropagation(); handleDeletePlayer(p.id); }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }} title="Elimina Calciatore">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
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
      
      {/* BARRA NAVIGAZIONE VERTICALE / ORIZZONTALE */}
      <div style={navContainerStyle}>
        {!isMobile && <div style={{ width: '52px', height: '52px', backgroundColor: '#da1b60', display: 'flex', alignItems: 'center', color: '#fff', fontWeight: '900', fontSize: '22px', borderRadius: '10px', justifyContent: 'center' }}>FM</div>}
        <button onClick={() => handleSidebarClick('board')} style={navButtonStyle('board', '#a855f7')}><Users size={22} /></button>
        <button onClick={() => handleSidebarClick('vice')} style={navButtonStyle('vice', '#22d3ee')}><Sliders size={22} /></button>
        <button onClick={() => handleSidebarClick('scout')} style={navButtonStyle('scout', '#f43f5e')}><Search size={22} /></button>
        <button onClick={() => handleSidebarClick('ds')} style={navButtonStyle('ds', '#fbbf24')}><Briefcase size={22} /></button>
        <button onClick={() => handleSidebarClick('cfo')} style={navButtonStyle('cfo', '#10b981')}><TrendingUp size={22} /></button>
        <button onClick={() => handleSidebarClick('press')} style={navButtonStyle('press', '#ec4899')}><HelpCircle size={22} /></button>
        <button onClick={() => handleSidebarClick('youth')} style={navButtonStyle('youth', '#ffaa00')}><Award size={22} /></button>
        <button onClick={() => handleSidebarClick('analyst')} style={navButtonStyle('analyst', '#3b82f6')}><Activity size={22} /></button>
        {!isMobile && <div style={{ width: '44px', height: '2px', backgroundColor: '#231b3a', margin: '6px 0' }}></div>}
        <button onClick={() => handleSidebarClick('database')} style={navButtonStyle('database', '#da1b60')}><Database size={22} /></button>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingBottom: isMobile ? '70px' : '0px' }}>
        {activeRoom !== 'database' && renderChatWindow()}
        {activeRoom === 'database' && renderMasterDatabase()}
      </div>

      {/* FLYOUT MODALE: REFERTO TATTICO A TUTTO SCHERMO */}
      {selectedTacticReport && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(5, 3, 10, 0.95)', zIndex: 99999, display: 'flex', padding: isMobile ? '10px' : '40px' }}>
          <div style={{ margin: 'auto', width: '100%', maxWidth: '800px', backgroundColor: '#140f24', border: '3px solid #22d3ee', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #231b3a', paddingBottom: '14px', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '22px', fontWeight: '900', color: '#22d3ee' }}>📋 REFERTO TATTICO: {selectedTacticReport?.title?.toUpperCase() || 'TATTICA'}</h3>
              <button onClick={() => setSelectedTacticReport(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={26} /></button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', fontSize: '16px', color: '#e2e8f0', lineHeight: '1.7' }}>
              {formatMessageContent(selectedTacticReport?.content || '')}
            </div>
            <button onClick={() => setSelectedTacticReport(null)} style={{ marginTop: '16px', backgroundColor: '#22d3ee', color: '#000', border: 'none', padding: '14px', fontSize: '14px', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer' }}>Chiudi Documento</button>
          </div>
        </div>
      )}

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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', padding: '8px 12px', backgroundColor: '#090710', borderRadius: '6px' }}><span style={{ color: '#94a3b8' }}>Ruolo</span><span style={{ color: '#22d3ee', fontWeight: '900' }}>{selectedProfile?.position || 'N/D'}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', padding: '8px 12px', backgroundColor: '#090710', borderRadius: '6px' }}><span style={{ color: '#94a3b8' }}>Età</span><span style={{ color: '#ffffff', fontWeight: '900' }}>{selectedProfile?.age || 'N/D'}</span></div>
            {selectedProfile?.attributes && Object.entries(selectedProfile.attributes).map(([key, val]) => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', padding: '8px 12px', backgroundColor: '#090710', borderRadius: '6px' }}><span style={{ color: '#94a3b8' }}>{key}</span><span style={{ color: '#34d399', fontWeight: '900' }}>{String(val)}</span></div>
            ))}
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
