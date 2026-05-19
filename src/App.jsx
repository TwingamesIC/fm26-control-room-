import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient'
import { MessageSquare, Database, Send, Users, Sliders, Sparkles, ImageIcon, X, ChevronRight, Trash2, ChevronDown, FileSpreadsheet } from 'lucide-react'
import { GoogleGenerativeAI } from '@google/generative-ai'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// ==========================================
// IL CERVELLO DI FM26 (ANALISI PROFONDA E SPARRING PARTNER)
// ==========================================
const FM26_CORE_ENGINE = `
Sei il Vice Allenatore e Chief Data Analyst del club in Football Manager 2026. Il tuo allenatore è "omiserez" (il Mister). Io che ti parlo sono omiserez.

[!!! STILE DI CONVERSAZIONE E IDENTITÀ - REGOLA SUPREMA !!!]
1. CONFRONTO TOTALE E ANALISI PROFONDA: Il Mister NON vuole risposte brevi, superficiali o "mezze risposte". Vuole un vero e proprio CONFRONTO TATTICO ad altissimo livello. Quando ti fa una domanda o ti invia uno screen, sviscera l'argomento. Scrivi paragrafi lunghi e dettagliati, esplora diverse angolazioni (fase di possesso, transizioni, baricentro, pressing).
2. SPARRING PARTNER TATTICO (L'AVVOCATO DEL DIAVOLO): Non dirmi solo "Sì, ottima idea". Trova i punti deboli delle mie tattiche e dei miei giocatori. Sii critico, costruttivo e schietto. Se una mia idea non funziona con i giocatori che abbiamo in rosa, dimmelo chiaramente e spiegami il perché dal punto di vista tecnico.
3. USA I DATI COME UN PROFESSIONISTA: Integra i dati del database (ruoli, attributi, media voto) in discorsi ampi per giustificare le tue tesi. Fai paragoni tra giocatori.
4. NIENTE CODICE: Non generare mai codice JSON, tabelle ASCII o lavagne visive. Voglio solo testo ben formattato e discorsivo. Usa i nomi dei ruoli in inglese (es: **Deep Lying Playmaker**, **Inverted Winger**), ma discuti in italiano.
5. IL RILANCIO: Chiudi sempre le tue analisi fiume passandomi la palla con una domanda tattica precisa, sfidandomi a trovare una soluzione insieme a te per continuare il dibattito.
`;

function getRolePrompt(role, clubName, clubVision, clubHistory, finances, squadContext, shortlistContext, matchesContext, tacticalFocus, tacticReports) {
  const baseRules = FM26_CORE_ENGINE + `\nCLUB ATTUALE: ${clubName.toUpperCase()}.\n`;
  
  const savedTacticsSummary = tacticReports && tacticReports.length > 0 
    ? tacticReports.map(t => `${t.title}: ${t.content.substring(0, 200)}...`).join(' | ') 
    : 'Nessuna tattica specifica assimilata in archivio.';

  const contextData = `
🎯 PROGETTO SOCIETARIO: "${clubVision}"
📜 STORIA DEL CLUB: "${clubHistory}"
📋 TATTICHE ASSIMILATE: ${savedTacticsSummary}
DATI ROSA ATTUALE (Non chiedere altri dati oltre questi): ${JSON.stringify(squadContext.slice(0, 40))}
`;

  return baseRules + contextData;
}

export default function App() {
  const [isMounted, setIsMounted] = useState(false);
  const [activeRoom, setActiveRoom] = useState('vice') 
  const [dbSubTab, setDbSubTab] = useState('first_team') 
  const [sortField, setSortField] = useState('name')
  const [sortDirection, setSortDirection] = useState('asc')
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  const [mobileViewTab, setMobileViewTab] = useState('chat')
  const [showScrollBottom, setShowScrollBottom] = useState(false) 
  const [pendingImages, setPendingImages] = useState([]);
  const [uploadProgressText, setUploadProgressText] = useState('')

  const [clubName, setClubName] = useState(() => { if (typeof window !== 'undefined') { return localStorage.getItem('hq_club_name') || 'Sora' } return 'Sora' })
  const [clubVision, setClubVision] = useState(() => { if (typeof window !== 'undefined') { return localStorage.getItem('hq_club_vision') || 'Nessun obiettivo a lungo termine impostato.' } return '' }) 
  const [clubHistory, setClubHistory] = useState(() => { if (typeof window !== 'undefined') { return localStorage.getItem('hq_club_history') || '' } return '' })
  
  const [players, setPlayers] = useState(() => { if (typeof window !== 'undefined') { try { return JSON.parse(localStorage.getItem('hq_players')) || []; } catch(e) { return []; } } return []; })
  const [shortlist, setShortlist] = useState(() => { if (typeof window !== 'undefined') { try { return JSON.parse(localStorage.getItem('hq_shortlist')) || []; } catch(e) { return []; } } return []; })
  const [matches, setMatches] = useState(() => { if (typeof window !== 'undefined') { try { return JSON.parse(localStorage.getItem('hq_matches')) || []; } catch(e) { return []; } } return []; })
  const [messages, setMessages] = useState(() => { if (typeof window !== 'undefined') { try { return JSON.parse(localStorage.getItem('hq_messages')) || [{ sender_role: 'system', content: 'Cervello tattico sbloccato in modalità Sparring Partner. Interfaccia iOS attiva.' }]; } catch(e) { return [{ sender_role: 'system', content: 'Centrale operativa allineata.' }]; } } return []; })
  const [tacticReports, setTacticReports] = useState(() => { if (typeof window !== 'undefined') { try { return JSON.parse(localStorage.getItem('hq_tactic_reports')) || []; } catch(e) { return []; } } return []; })
  const [finances, setFinances] = useState(() => { if (typeof window !== 'undefined') { try { return JSON.parse(localStorage.getItem('hq_finances')) || { balance: 2500000, transfer_budget: 800000, wage_budget: 15000 }; } catch(e) { return { balance: 2500000, transfer_budget: 800000, wage_budget: 15000 }; } } return { balance: 2500000, transfer_budget: 800000, wage_budget: 15000 }; })

  const [personality, setPersonality] = useState(() => { if (typeof window !== 'undefined') return localStorage.getItem('hq_coach_personality') || 'professional'; return 'professional'; })
  const [pressStyle, setPressStyle] = useState(() => { if (typeof window !== 'undefined') return localStorage.getItem('hq_press_style') || 'diplomatic'; return 'diplomatic'; })
  const [squadShield, setSquadShield] = useState(() => { if (typeof window !== 'undefined') return localStorage.getItem('hq_squad_shield') || 'shield_total'; return 'shield_total'; })
  const [rivalRelation, setRivalRelation] = useState(() => { if (typeof window !== 'undefined') return localStorage.getItem('hq_rival_relation') || 'respectful'; return 'respectful'; })
  const [tacticalFocus, setTacticalFocus] = useState(() => { if (typeof window !== 'undefined') return localStorage.getItem('hq_tactical_focus') || 'pragmatic'; return 'pragmatic'; })

  const [simCost, setSimCost] = useState('500000')
  const [simWage, setSimWage] = useState('2000')
  const [simYears, setSimYears] = useState('3')
  const [simResult, setSimResult] = useState(null)
  
  const [externalTacticInput, setExternalTacticInput] = useState('')
  const [selectedProfile, setSelectedProfile] = useState(null) 
  const [selectedTacticReport, setSelectedTacticReport] = useState(null)
  const [editingNotes, setEditingNotes] = useState('')
  const [isSavingNotes, setIsSavingNotes] = useState(false)
  
  const [isUploading, setIsUploading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [chatInput, setChatInput] = useState('')

  const fileInputRef = useRef(null)
  const excelInputRef = useRef(null)
  const genericUploadRef = useRef(null)
  const tacticImageUploadRef = useRef(null) 
  const chatImageInputRef = useRef(null) 
  const chatContainerRef = useRef(null)

  useEffect(() => {
    setIsMounted(true); 
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => { if (isMounted) localStorage.setItem('hq_players', JSON.stringify(players)) }, [players, isMounted])
  useEffect(() => { if (isMounted) localStorage.setItem('hq_shortlist', JSON.stringify(shortlist)) }, [shortlist, isMounted])
  useEffect(() => { if (isMounted) localStorage.setItem('hq_matches', JSON.stringify(matches)) }, [matches, isMounted])
  useEffect(() => { if (isMounted) localStorage.setItem('hq_tactic_reports', JSON.stringify(tacticReports)) }, [tacticReports, isMounted])
  useEffect(() => { if (isMounted) localStorage.setItem('hq_messages', JSON.stringify(messages)) }, [messages, isMounted])
  useEffect(() => { if (isMounted) localStorage.setItem('hq_finances', JSON.stringify(finances)) }, [finances, isMounted])
  useEffect(() => { if (isMounted) localStorage.setItem('hq_coach_personality', personality) }, [personality, isMounted])
  useEffect(() => { if (isMounted) localStorage.setItem('hq_press_style', pressStyle) }, [pressStyle, isMounted])
  useEffect(() => { if (isMounted) localStorage.setItem('hq_squad_shield', squadShield) }, [squadShield, isMounted])
  useEffect(() => { if (isMounted) localStorage.setItem('hq_rival_relation', rivalRelation) }, [rivalRelation, isMounted])
  useEffect(() => { if (isMounted) localStorage.setItem('hq_tactical_focus', tacticalFocus) }, [tacticalFocus, isMounted])
  useEffect(() => { if (isMounted) localStorage.setItem('hq_club_name', clubName) }, [clubName, isMounted])
  useEffect(() => { if (isMounted) localStorage.setItem('hq_club_vision', clubVision) }, [clubVision, isMounted]) 
  useEffect(() => { if (isMounted) localStorage.setItem('hq_club_history', clubHistory) }, [clubHistory, isMounted])

  useEffect(() => {
    if (chatContainerRef.current) { chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight; }
  }, [messages, isTyping])

  if (!isMounted) {
    return (
      <div style={{ backgroundColor: '#0E0E0F', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#A8C7FA', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <Sparkles size={40} style={{ marginBottom: '16px', color: '#A8C7FA' }} />
        <h1 style={{ fontWeight: '500', fontSize: '20px' }}>Avvio Segreteria...</h1>
      </div>
    );
  }

  function normalizeName(name) { return !name ? '' : name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(); }

  function handleChatScroll() {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    if (scrollHeight - scrollTop - clientHeight > 100) { setShowScrollBottom(true); } else { setShowScrollBottom(false); }
  }

  function scrollToBottom() {
    if (chatContainerRef.current) { chatContainerRef.current.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' }); }
  }

  function formatMessageContent(text) {
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
        if (part.startsWith('**') && part.endsWith('**')) { return <strong key={i} style={{ color: '#A8C7FA', fontWeight: '600' }}>{part.slice(2, -2)}</strong>; }
        return <span key={i}>{part}</span>;
      });

      if (isHeader || isSubHeader) return <div key={index} style={{ marginTop: '16px', marginBottom: '8px', fontSize: '1.1em', fontWeight: '600', color: '#E3E3E3' }}>{renderedParts}</div>;
      if (isList) return <div key={index} style={{ display: 'flex', gap: '10px', marginTop: '8px', paddingLeft: '4px' }}><span style={{ color: '#A8C7FA' }}>•</span><div style={{ flex: 1, color: '#E3E3E3' }}>{renderedParts}</div></div>;
      return <div key={index} style={{ marginTop: '6px', minHeight: '14px', color: '#E3E3E3' }}>{renderedParts}</div>;
    });
    return <div>{lines}</div>;
  }

  async function fetchCloudData() {
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
  }

  async function handleClearAllData() {
    if (window.confirm("Vuoi azzerare la sede societaria e ricominciare da zero? ATTENZIONE: Questo cancellerà tutta la memoria dello staff.")) {
      setPlayers([]); setShortlist([]); setMatches([]); setTacticReports([]);
      setMessages([{ sender_role: 'system', content: 'Database azzerato. Memoria dello staff pulita.' }]);
      setFinances({ balance: 2500000, transfer_budget: 800000, wage_budget: 15000 }); 
      setSelectedProfile(null); localStorage.clear();
      try { await supabase.from('players').delete().neq('id', 0); await supabase.from('shortlist').delete().neq('id', 0); await supabase.from('matches').delete().neq('id', 0); await supabase.from('club_messages').delete().neq('id', 0); } catch(e) {}
    }
  }

  function handleSidebarClick(room) { setActiveRoom(room); setMobileViewTab('chat'); }
  
  function handleSelectPlayer(player, event) {
    if (event.target.closest('button')) return; 
    if (!player) return;
    setSelectedProfile(player); setEditingNotes(player.notes || '');
  }

  async function handleDeletePlayer(id) {
    if (window.confirm("Eliminare definitivamente il giocatore dall'archivio?")) {
      setPlayers(prev => prev.filter(p => p.id !== id));
      try { await supabase.from('players').delete().eq('id', id); } catch(e) {}
      if (selectedProfile && selectedProfile.id === id) setSelectedProfile(null);
    }
  }

  async function handleSavePlayerNotes() {
    if (!selectedProfile) return; setIsSavingNotes(true);
    try {
      const updatedPlayers = players.map(p => p.id === selectedProfile.id ? { ...p, notes: editingNotes } : p);
      setPlayers(updatedPlayers); setSelectedProfile(prev => ({ ...prev, notes: editingNotes }));
      await supabase.from('players').update({ notes: editingNotes }).eq('id', selectedProfile.id);
      const systemNote = { sender_role: 'system', content: `📝 Fascicolo aggiornato per ${selectedProfile.name}` };
      setMessages(prev => [...prev, systemNote]);
      try { await supabase.from('club_messages').insert([systemNote]); } catch(e) {}
    } catch (e) { console.error(e); } finally { setIsSavingNotes(false); }
  }

  function handleSimulateTransfer() {
    const cost = parseFloat(simCost) || 0; const weeklyWage = parseFloat(simWage) || 0; const years = parseInt(simYears) || 1;
    const annualAmortization = cost / years; const annualWageCost = weeklyWage * 52; const totalAnnualImpact = annualAmortization + annualWageCost;
    let status = 'APPROVATO'; let color = '#81C995'; let notes = `Operazione sostenibile. Impatto annuo: €${totalAnnualImpact.toLocaleString()}.`;
    if (cost > finances.transfer_budget) { status = 'BLOCCATO'; color = '#F28B82'; notes = `Fondi insufficienti nel budget trasferimenti.`; }
    else if (weeklyWage > (finances.wage_budget * 0.3)) { status = 'RISCHIO'; color = '#FDE293'; notes = `L'ingaggio supera il 30% del tetto salariale.`; }
    setSimResult({ status, color, annualAmortization, annualWageCost, notes });
  }

  function handleSort(field) {
    if (sortField === field) { setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc'); } 
    else { setSortField(field); setSortDirection('asc'); }
  }

  function handlePendingImagesSelection(e) {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      setPendingImages(prev => [...prev, ...filesArray]);
    }
    if (chatImageInputRef.current) chatImageInputRef.current.value = "";
  }

  function removePendingImage(index) { setPendingImages(prev => prev.filter((_, i) => i !== index)); }

  async function handleSendMessage() {
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

      let instructionPrompt = getRolePrompt(activeRoom, clubName, clubVision, clubHistory, finances, squadContext, shortlistContext, matchesContext, tacticalFocus, tacticReports);

      if (imagesToSend.length > 0) {
        instructionPrompt += `\n\nIL MISTER TI HA ALLEGATO ${imagesToSend.length} IMMAGINI E DICE: "${currentInputText || 'Mister, che ne pensi di questi dati?'}"`;
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
      const aiMessageObj = { sender_role: 'vice', content: result.response.text() };
      setMessages(prev => [...prev, aiMessageObj]);
      try { await supabase.from('club_messages').insert([aiMessageObj]); } catch(e) {}
    } catch (error) { console.error(error); } finally { setIsTyping(false); }
  }

  async function handleAnalyzeExternalTactic() {
    if (!externalTacticInput.trim()) return; setIsTyping(true); if (isMobile) setMobileViewTab('chat');
    const inputBuffer = externalTacticInput; setExternalTacticInput('');
    try {
      const safePlayers = Array.isArray(players) ? players : [];
      const squadContext = safePlayers.map(p => ({ nome: p?.name, ruoli: p?.position, stats: p?.attributes || {} }));
      const instructionPrompt = getRolePrompt('vice', clubName, clubVision, clubHistory, finances, squadContext, [], [], tacticalFocus, tacticReports) + 
      `\n\nSTUDIA QUESTA TATTICA O GUIDA: """${inputBuffer}""". 
      Fai un riassunto dei movimenti, poi adattala alla nostra rosa attuale usando i nostri dati e dimmi chiaramente se possiamo giocarla o no.
      Inizia la risposta con TITOLO: [Nome breve della tattica]`;
      
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(instructionPrompt); const outputText = result.response.text();
      const cleanTitle = (outputText.match(/TITOLO:\s*(.*)/i)?.[1] || `Tattica del ${new Date().toLocaleDateString()}`).replace('[', '').replace(']', '').trim();
      const userMsg = { sender_role: `user:vice`, content: `📋 Studia e memorizza questa idea/tattica.` };
      const aiMsg = { sender_role: 'vice', content: outputText }; setMessages(prev => [...prev, userMsg, aiMsg]);
      setTacticReports(prev => [{ title: cleanTitle, content: outputText, id: Date.now() }, ...prev]); 
      try { await supabase.from('club_messages').insert([userMsg, aiMsg]); } catch(e) {}
    } catch (error) { console.error(error); } finally { setIsTyping(false); }
  }

  async function handleTacticImagesUpload(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    setIsTyping(true);
    if (isMobile) setMobileViewTab('chat');

    try {
      const imageParts = await Promise.all(Array.from(files).map(file => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => { resolve({ inlineData: { data: reader.result.split(',')[1], mimeType: file.type } }); };
          reader.readAsDataURL(file);
        });
      }));

      const safePlayers = Array.isArray(players) ? players : [];
      const squadContext = safePlayers.map(p => ({ nome: p?.name, ruoli: p?.position, stats: p?.attributes || {} }));
      
      const instructionPrompt = getRolePrompt('vice', clubName, clubVision, clubHistory, finances, squadContext, [], [], tacticalFocus, tacticReports) + 
      `\n\nIl Mister ti ha inviato gli SCREENSHOT della tattica.
      1. Estrai Modulo, Ruoli esatti e Istruzioni.
      2. Adattala alla rosa incrociando attributi e medie voto che hai in memoria.
      Inizia con TITOLO: [Nome del Modulo]`;

      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const promptArray = [instructionPrompt, ...imageParts];
      
      const result = await model.generateContent(promptArray);
      const outputText = result.response.text();
      
      const cleanTitle = (outputText.match(/TITOLO:\s*(.*)/i)?.[1] || `Tattica Visiva del ${new Date().toLocaleDateString()}`).replace('[', '').replace(']', '').trim();
      const userMsg = { sender_role: `user:vice`, content: `📷 [Allegati ${files.length} screen tattici] Studia e memorizza questa tattica dalle immagini.` };
      const aiMsg = { sender_role: 'vice', content: outputText }; 
      setMessages(prev => [...prev, userMsg, aiMsg]);
      setTacticReports(prev => [{ title: cleanTitle, content: outputText, id: Date.now() }, ...prev]); 
      try { await supabase.from('club_messages').insert([userMsg, aiMsg]); } catch(e) {}
    } catch (error) { console.error(error); } finally { setIsTyping(false); if (tacticImageUploadRef.current) tacticImageUploadRef.current.value = ""; }
  }

  function handleDeleteTacticReport(id) {
    if (window.confirm("Vuoi eliminare questa tattica dall'archivio? Il Vice non la ricorderà più.")) {
      setTacticReports(prev => prev.filter(t => t.id !== id));
      if (selectedTacticReport && selectedTacticReport.id === id) { setSelectedTacticReport(null); }
    }
  }

  async function handleGenericDocsUpload(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    let addedMatches = 0; let addedScouts = 0; let updatedFinances = false;
    setUploadProgressText(`⏳ Analisi di ${files.length} documenti societari...`);

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      for (let i = 0; i < files.length; i++) {
        setUploadProgressText(`⏳ Archiviazione documento ${i + 1} di ${files.length}...`);
        const file = files[i];
        const imageBase64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result.split(',')[1]);
          reader.readAsDataURL(file);
        });
        const imagePart = { inlineData: { data: imageBase64, mimeType: file.type } };

        const prompt = `Analizza questa immagine di Football Manager 2026. Capisci da solo di cosa si tratta e restituisci SOLO un JSON puro, senza formattazione Markdown.
        Formati ammessi:
        1. Se Finanze: { "type": "finance", "balance": numero, "transfer_budget": numero, "wage_budget": numero }
        2. Se Partita: { "type": "match", "opponent": "nome avversaria", "result": "es. 2-1", "xg_team": num, "xg_opp": num, "analysis": "breve" }
        3. Se Giocatore (Scout): { "type": "scout", "name": "nome", "position": "ruolo", "verdict": "ACQUISTARE o EVITARE", "analysis": "breve" }
        `;
        
        const result = await model.generateContent([prompt, imagePart]);
        const cleanText = result.response.text().replace(/```json/gi, '').replace(/```/g, '').trim();
        
        try {
          const parsed = JSON.parse(cleanText);
          if (parsed.type === 'finance') {
            setFinances(prev => {
              const newF = { ...prev, balance: parsed.balance || prev.balance, transfer_budget: parsed.transfer_budget || prev.transfer_budget, wage_budget: parsed.wage_budget || prev.wage_budget };
              try { supabase.from('club_finances').update({ balance: newF.balance, transfer_budget: newF.transfer_budget, wage_budget: newF.wage_budget }).eq('id', 1); } catch(e){}
              return newF;
            });
            updatedFinances = true;
          } else if (parsed.type === 'match') {
            const m = { opponent: parsed.opponent || 'Avversario', result: parsed.result || '-', xg_team: parsed.xg_team || '-', xg_opp: parsed.xg_opp || '-', analysis: parsed.analysis || '' };
            setMatches(prev => [m, ...prev]); addedMatches++;
            try { await supabase.from('matches').insert([m]); } catch(e){}
          } else if (parsed.type === 'scout') {
            const s = { name: parsed.name || 'Sconosciuto', position: parsed.position || '-', verdict: parsed.verdict || 'VAGLIATO', analysis: parsed.analysis || '' };
            setShortlist(prev => [s, ...prev]); addedScouts++;
            try { await supabase.from('shortlist').insert([s]); } catch(e){}
          }
        } catch (jsonErr) {}
      }
      
      setUploadProgressText(`✅ Archiviazione completata!`);
      const sysMsg = { sender_role: 'system', content: `✅ Segreteria: archiviate ${addedMatches} partite, ${addedScouts} referti scout, finanze ${updatedFinances ? 'aggiornate' : 'invariate'}.` };
      setMessages(prev => [...prev, sysMsg]);
      try { await supabase.from('club_messages').insert([sysMsg]); } catch(e) {}
    } catch (e) { 
      console.error(e); setUploadProgressText("❌ Errore durante l'archiviazione.");
    } finally { 
      setTimeout(() => { setIsUploading(false); setUploadProgressText(''); }, 3500);
      if(genericUploadRef.current) genericUploadRef.current.value = "";
    } 
  }

  function handleExcelUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgressText(`⏳ Lettura del file Excel in corso...`);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const xlsxModule = await import('xlsx');
        const data = e.target.result;
        const workbook = xlsxModule.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = xlsxModule.utils.sheet_to_json(worksheet);
        
        if (jsonData.length === 0) { setUploadProgressText("❌ Errore: Excel vuoto."); setIsUploading(false); return; }

        let updatedCount = 0;
        const newPlayers = jsonData.map(row => {
          const name = row['Nome'] || row['Name'] || row['Player'] || 'Sconosciuto';
          const position = row['Posizione'] || row['Ruolo'] || row['Position'] || 'N/D';
          const age = parseInt(row['Età'] || row['Age']) || null;
          const attributes = { ...row };
          
          const presenze = row['Presenze'] ?? row['Pres'] ?? row['Apps'] ?? row['Partite'] ?? attributes['Presenze'] ?? '-';
          const gol = row['Gol'] ?? row['Goals'] ?? row['G'] ?? row['Reti'] ?? attributes['Gol'] ?? '-';
          const mv = row['Media Voto'] ?? row['M. Voto'] ?? row['MV'] ?? row['Av Rat'] ?? attributes['Media Voto'] ?? '-';
          
          attributes['Presenze'] = String(presenze);
          attributes['Gol'] = String(gol);
          attributes['Media Voto'] = String(mv);

          delete attributes['Nome']; delete attributes['Name']; delete attributes['Player'];
          delete attributes['Posizione']; delete attributes['Ruolo']; delete attributes['Position'];
          delete attributes['Età']; delete attributes['Age'];
          
          return { name, position, age, type: 'player', attributes };
        });

        setPlayers(prev => {
          const list = Array.isArray(prev) ? [...prev] : []; 
          newPlayers.forEach(np => {
            const idx = list.findIndex(x => normalizeName(x?.name) === normalizeName(np.name));
            if (idx >= 0) { list[idx] = { ...list[idx], ...np, attributes: { ...(list[idx]?.attributes || {}), ...(np.attributes || {}) } }; updatedCount++; } 
            else { list.push(np); updatedCount++; }
          }); return list;
        });

        try {
          let { data: dbPlayers } = await supabase.from('players').select('*');
          const safeDbPlayers = Array.isArray(dbPlayers) ? dbPlayers : [];
          for (const p of newPlayers) {
            const match = safeDbPlayers.find(x => normalizeName(x?.name) === normalizeName(p.name));
            if (match) { await supabase.from('players').update({ age: p.age, position: p.position, attributes: { ...(match.attributes || {}), ...p.attributes } }).eq('id', match.id); } 
            else { await supabase.from('players').insert([p]); }
          }
        } catch(e) {}

        setUploadProgressText(`✅ Excel caricato! Aggiornati ${updatedCount} profili nel Database.`);
        const sysMsg = { sender_role: 'system', content: `✅ Database Aggiornato tramite File Excel. Sincronizzati ${updatedCount} giocatori.` };
        setMessages(prev => [...prev, sysMsg]);
        try { await supabase.from('club_messages').insert([sysMsg]); } catch(e) {}
      } catch (error) {
        console.error("Errore lettura Excel:", error);
        setUploadProgressText("❌ Errore file Excel.");
      } finally {
        setTimeout(() => { setIsUploading(false); setUploadProgressText(''); }, 3500);
        if(excelInputRef.current) excelInputRef.current.value = "";
      }
    };
    reader.onerror = () => { setUploadProgressText("❌ Errore di lettura."); setIsUploading(false); };
    reader.readAsBinaryString(file);
  }

  async function handleImageUploadOCR(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true); let totalExtracted = 0;
    setUploadProgressText(`⏳ Inizio scansione di ${files.length} immagini...`);

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgressText(`⏳ Analisi foto ${i + 1} di ${files.length} in corso...`);
        const imageBase64 = await new Promise((resolve) => { const reader = new FileReader(); reader.onloadend = () => resolve(reader.result.split(',')[1]); reader.readAsDataURL(file); });
        const imagePart = { inlineData: { data: imageBase64, mimeType: file.type } };
        
        const prompt = `Estrai TUTTI i dati e OGNI SINGOLO ATTRIBUTO (Tecnici, Mentali, Fisici da 1 a 20) da questo screenshot di FM26.
        Rispondi SOLO con array JSON puro:
        [ { "type": "player", "name": "Nome", "age": "num", "position": "Ruolo", "attributes": { "Presenze": "num", "Media Voto": "float", "Ingaggio": "txt", "Valore": "txt", "Gol": "num" } } ]`;
        
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
      }
      
      setUploadProgressText(`✅ Scansione completata!`);
      const systemNote = { sender_role: 'system', content: `✅ Database Aggiornato tramite screenshot.` };
      setMessages(prev => [...prev, systemNote]);
      try { await supabase.from('club_messages').insert([systemNote]); } catch(e) {}
    } catch (e) { 
      console.error(e); setUploadProgressText("❌ Errore durante la scansione.");
    } finally { 
      setTimeout(() => { setIsUploading(false); setUploadProgressText(''); }, 3500);
      if(fileInputRef.current) fileInputRef.current.value = "";
    } 
  }

  function renderChatWindow() {
    const safeMessages = Array.isArray(messages) ? messages : [];
    const visibleMessages = safeMessages.filter(msg => {
      if (!msg || !msg.sender_role) return false;
      if (msg.sender_role === 'system') return true;
      if (activeRoom === 'board') return msg.sender_role === 'board' || msg.sender_role === 'user:board' || msg.sender_role === 'user';
      return msg.sender_role === 'vice' || msg.sender_role === 'user:vice'; 
    });

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#0E0E0F', width: '100%', height: '100%', position: 'relative' }}>
        <div style={{ height: '70px', padding: '0 24px', display: 'flex', alignItems: 'center', backgroundColor: '#0E0E0F', justifyContent: 'space-between', borderBottom: '1px solid #1E1F22' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Sparkles size={22} color="#A8C7FA" /> 
            <h2 style={{ fontSize: isMobile ? '16px' : '18px', color: '#E3E3E3', margin: 0, fontWeight: '500' }}>
              {activeRoom === 'board' ? 'Diretta Plenaria' : `Vice Allenatore`}
            </h2>
          </div>
        </div>

        {isMobile && (
          <div style={{ display: 'flex', backgroundColor: '#0E0E0F', padding: '12px', gap: '8px', borderBottom: '1px solid #1E1F22' }}>
            <button onClick={() => setMobileViewTab('chat')} style={{ flex: 1, padding: '10px', fontSize: '13px', fontWeight: '500', border: 'none', borderRadius: '20px', backgroundColor: mobileViewTab === 'chat' ? '#1E1F22' : 'transparent', color: mobileViewTab === 'chat' ? '#A8C7FA' : '#8E918F' }}>Chat</button>
            <button onClick={() => setMobileViewTab('tools')} style={{ flex: 1, padding: '10px', fontSize: '13px', fontWeight: '500', border: 'none', borderRadius: '20px', backgroundColor: mobileViewTab === 'tools' ? '#1E1F22' : 'transparent', color: mobileViewTab === 'tools' ? '#A8C7FA' : '#8E918F' }}>Strumenti</button>
          </div>
        )}

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', flexDirection: isMobile ? 'column' : 'row', position: 'relative' }}>
          
          {(!isMobile || mobileViewTab === 'chat') && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#0E0E0F', position: 'relative' }}>
              <div ref={chatContainerRef} onScroll={handleChatScroll} style={{ flex: 1, padding: isMobile ? '16px' : '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '100px' }}>
                
                {visibleMessages.map((msg, index) => {
                  let align = 'flex-start'; 
                  let isUser = false;
                  const role = msg?.sender_role ? String(msg.sender_role) : '';
                  
                  if (role.startsWith('user')) { align = 'flex-end'; isUser = true; }

                  return (
                    <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: align, width: '100%' }}>
                      <div style={{ 
                        padding: '12px 18px', 
                        fontSize: '15px', 
                        backgroundColor: isUser ? '#282A2C' : '#1E1F22', 
                        color: '#E3E3E3', 
                        borderRadius: isUser ? '24px 24px 4px 24px' : '24px 24px 24px 4px', 
                        maxWidth: '80%', 
                        lineHeight: '1.5',
                        fontWeight: '400'
                      }}>
                        {formatMessageContent(msg?.content || '')}
                      </div>
                    </div>
                  );
                })}
                {isTyping && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <div style={{ padding: '12px 18px', fontSize: '15px', backgroundColor: '#1E1F22', color: '#8E918F', borderRadius: '24px 24px 24px 4px', fontStyle: 'italic' }}>Sta scrivendo...</div>
                  </div>
                )}
              </div>

              {showScrollBottom && (
                <button onClick={scrollToBottom} style={{ position: 'absolute', bottom: '100px', right: '20px', width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#1E1F22', color: '#E3E3E3', border: '1px solid #444746', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 50 }}>
                  <ChevronDown size={24} />
                </button>
              )}

              <div style={{ position: 'absolute', bottom: isMobile ? '20px' : '30px', left: '50%', transform: 'translateX(-50%)', width: isMobile ? '92%' : '80%', maxWidth: '800px', zIndex: 60 }}>
                {pendingImages.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', overflowX: 'auto', padding: '8px', backgroundColor: '#1E1F22', borderRadius: '16px' }}>
                    {pendingImages.map((img, idx) => (
                      <div key={idx} style={{ position: 'relative', width: '50px', height: '50px', flexShrink: 0, borderRadius: '8px', overflow: 'hidden' }}>
                        <img src={URL.createObjectURL(img)} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button onClick={() => removePendingImage(idx)} style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}><X size={10} /></button>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#1E1F22', borderRadius: '30px', padding: '6px 8px', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}>
                  <input type="file" accept="image/*" multiple ref={chatImageInputRef} onChange={handlePendingImagesSelection} style={{ display: 'none' }} />
                  <button onClick={() => chatImageInputRef.current.click()} disabled={isTyping} style={{ background: 'none', border: 'none', color: '#8E918F', cursor: 'pointer', padding: '10px', borderRadius: '50%', display: 'flex', alignItems: 'center' }} title="Allega">
                    <ImageIcon size={20} />
                  </button>
                  <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="Scrivi al Vice..." style={{ flex: 1, backgroundColor: 'transparent', border: 'none', padding: '10px 14px', fontSize: '15px', color: '#E3E3E3', outline: 'none' }} />
                  <button onClick={handleSendMessage} disabled={isTyping || (!chatInput.trim() && pendingImages.length === 0)} style={{ background: (chatInput.trim() || pendingImages.length > 0) ? '#A8C7FA' : '#282A2C', border: 'none', color: (chatInput.trim() || pendingImages.length > 0) ? '#0E0E0F' : '#8E918F', cursor: (chatInput.trim() || pendingImages.length > 0) ? 'pointer' : 'default', padding: '10px', borderRadius: '50%', display: 'flex', alignItems: 'center', transition: 'background 0.2s' }}>
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {(!isMobile || mobileViewTab === 'tools') && (
            <div style={{ width: isMobile ? '100%' : '400px', backgroundColor: '#0E0E0F', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', borderLeft: isMobile ? 'none' : '1px solid #1E1F22', boxSizing: 'border-box', overflowY: 'auto' }}>
              
              {activeRoom === 'board' && (
                <>
                  <h3 style={{ fontSize: '14px', color: '#A8C7FA', margin: '0 0 8px 0', fontWeight: '500' }}>Identità Societaria</h3>
                  
                  <div style={{ backgroundColor: '#1E1F22', padding: '16px', borderRadius: '16px' }}>
                    <label style={{ fontSize: '12px', color: '#8E918F', display: 'block', marginBottom: '8px' }}>Progetto e Visione</label>
                    <textarea value={clubVision} onChange={(e) => setClubVision(e.target.value)} placeholder="Inserisci il progetto..." style={{ width: '100%', height: '80px', backgroundColor: '#0E0E0F', border: 'none', padding: '12px', color: '#E3E3E3', fontSize: '14px', resize: 'none', borderRadius: '12px', boxSizing: 'border-box' }} />
                  </div>

                  <div style={{ backgroundColor: '#1E1F22', padding: '16px', borderRadius: '16px' }}>
                    <label style={{ fontSize: '12px', color: '#8E918F', display: 'block', marginBottom: '8px' }}>Storia del Club</label>
                    <textarea value={clubHistory} onChange={(e) => setClubHistory(e.target.value)} placeholder="Storia e albi d'oro..." style={{ width: '100%', height: '100px', backgroundColor: '#0E0E0F', border: 'none', padding: '12px', color: '#E3E3E3', fontSize: '14px', resize: 'vertical', borderRadius: '12px', boxSizing: 'border-box' }} />
                  </div>

                  <div style={{ backgroundColor: '#1E1F22', padding: '16px', borderRadius: '16px' }}>
                    <label style={{ fontSize: '12px', color: '#8E918F', display: 'block', marginBottom: '8px' }}>Club Attuale</label>
                    <input type="text" value={clubName} onChange={(e) => setClubName(e.target.value)} style={{ width: '100%', backgroundColor: '#0E0E0F', border: 'none', padding: '12px', color: '#E3E3E3', fontSize: '14px', borderRadius: '12px', boxSizing: 'border-box' }} />
                  </div>
                  
                  <div style={{ backgroundColor: '#1E1F22', padding: '16px', borderRadius: '16px', fontSize: '14px', color: '#E3E3E3', lineHeight: '1.6' }}>
                    <span style={{ color: '#A8C7FA', display: 'block', marginBottom: '8px', fontSize: '12px' }}>Stato Patrimoniale</span>
                    Giocatori: <strong>{Array.isArray(players) ? players.length : 0}</strong><br />
                    Cassa: <strong style={{ color: '#81C995' }}>€{finances?.balance?.toLocaleString() || 0}</strong><br />
                    Budget: <strong>€{finances?.transfer_budget?.toLocaleString() || 0}</strong>
                  </div>
                </>
              )}

              {activeRoom === 'vice' && (
                <>
                  <h3 style={{ fontSize: '14px', color: '#A8C7FA', margin: '0 0 8px 0', fontWeight: '500' }}>Strumenti del Vice</h3>

                  <div style={{ backgroundColor: '#1E1F22', padding: '16px', borderRadius: '16px' }}>
                    <span style={{ fontSize: '13px', color: '#E3E3E3', display: 'block', marginBottom: '12px' }}>Archivia Documenti</span>
                    <input type="file" accept="image/*" multiple ref={genericUploadRef} onChange={handleGenericDocsUpload} style={{ display: 'none' }} />
                    <button onClick={() => genericUploadRef.current.click()} disabled={isUploading} style={{ width: '100%', backgroundColor: '#282A2C', color: '#A8C7FA', border: 'none', padding: '12px', fontSize: '13px', borderRadius: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <Database size={16} /> {isUploading ? 'Analisi...' : 'Carica Finanze/Partite'}
                    </button>
                    {uploadProgressText && <div style={{ fontSize: '12px', color: '#FDE293', marginTop: '8px', textAlign: 'center' }}>{uploadProgressText}</div>}
                  </div>
                  
                  <div style={{ backgroundColor: '#1E1F22', padding: '16px', borderRadius: '16px' }}>
                    <span style={{ fontSize: '13px', color: '#E3E3E3', display: 'block', marginBottom: '12px' }}>Apprendimento Tattico</span>
                    <textarea value={externalTacticInput} onChange={(e) => setExternalTacticInput(e.target.value)} placeholder="Incolla il testo di una tattica..." style={{ width: '100%', height: '80px', backgroundColor: '#0E0E0F', border: 'none', padding: '12px', color: '#E3E3E3', fontSize: '13px', resize: 'none', borderRadius: '12px', boxSizing: 'border-box', marginBottom: '10px' }} />
                    <button onClick={handleAnalyzeExternalTactic} disabled={isTyping || !externalTacticInput.trim()} style={{ backgroundColor: '#A8C7FA', color: '#0E0E0F', border: 'none', padding: '10px', fontSize: '13px', borderRadius: '24px', cursor: 'pointer', width: '100%', marginBottom: '10px' }}>Studia da Testo</button>
                    <input type="file" accept="image/*" multiple ref={tacticImageUploadRef} onChange={handleTacticImagesUpload} style={{ display: 'none' }} />
                    <button onClick={() => tacticImageUploadRef.current.click()} disabled={isTyping} style={{ backgroundColor: '#282A2C', color: '#A8C7FA', border: 'none', padding: '10px', fontSize: '13px', borderRadius: '24px', cursor: 'pointer', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <ImageIcon size={14} /> Studia da Screenshot
                    </button>
                  </div>

                  <div style={{ backgroundColor: '#1E1F22', padding: '16px', borderRadius: '16px' }}>
                    <span style={{ fontSize: '12px', color: '#8E918F', display: 'block', marginBottom: '12px' }}>Tattiche in Memoria</span>
                    {(!Array.isArray(tacticReports) || tacticReports.length === 0) ? <div style={{ fontSize: '13px', color: '#8E918F' }}>Nessun report.</div> : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {tacticReports.map((rep, idx) => (
                          <div key={rep?.id || idx} style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => setSelectedTacticReport(rep)} style={{ flex: 1, textAlign: 'left', backgroundColor: '#0E0E0F', border: 'none', padding: '10px 14px', borderRadius: '12px', color: '#E3E3E3', fontSize: '13px', cursor: 'pointer' }}>{rep?.title || 'Tattica'}</button>
                            <button onClick={() => handleDeleteTacticReport(rep.id)} style={{ background: 'none', border: 'none', color: '#F28B82', cursor: 'pointer', padding: '0 8px' }}><Trash2 size={16} /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ backgroundColor: '#1E1F22', padding: '16px', borderRadius: '16px' }}>
                    <span style={{ fontSize: '13px', color: '#E3E3E3', display: 'block', marginBottom: '12px' }}>Carattere Manager</span>
                     <select value={personality} onChange={(e) => setPersonality(e.target.value)} style={{ width: '100%', backgroundColor: '#0E0E0F', border: 'none', padding: '12px', color: '#E3E3E3', fontSize: '13px', borderRadius: '12px', outline: 'none' }}>
                       <option value="professional">Professional (Diplomatico)</option>
                       <option value="aggressive">Aggressive (Mourinhiano)</option>
                       <option value="passionate">Passionate (Sanguigno)</option>
                     </select>
                  </div>
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
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#0E0E0F', height: '100%', overflow: 'hidden', width: '100%' }}>
        <div style={{ height: 'auto', minHeight: '70px', padding: '12px 24px', borderBottom: '1px solid #1E1F22', display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', width: isMobile ? '100%' : 'auto', paddingBottom: isMobile ? '4px' : '0' }}>
            <button onClick={() => setDbSubTab('first_team')} style={{ padding: '8px 16px', border: 'none', fontSize: '13px', backgroundColor: dbSubTab === 'first_team' ? '#A8C7FA' : '#1E1F22', color: dbSubTab === 'first_team' ? '#0E0E0F' : '#E3E3E3', borderRadius: '20px', flexShrink: 0, cursor: 'pointer' }}>Prima Squadra ({firstTeamPlayers.length})</button>
            <button onClick={() => setDbSubTab('youth')} style={{ padding: '8px 16px', border: 'none', fontSize: '13px', backgroundColor: dbSubTab === 'youth' ? '#A8C7FA' : '#1E1F22', color: dbSubTab === 'youth' ? '#0E0E0F' : '#E3E3E3', borderRadius: '20px', flexShrink: 0, cursor: 'pointer' }}>Under 20 ({youthPlayers.length})</button>
            <button onClick={() => setDbSubTab('shortlist')} style={{ padding: '8px 16px', border: 'none', fontSize: '13px', backgroundColor: dbSubTab === 'shortlist' ? '#A8C7FA' : '#1E1F22', color: dbSubTab === 'shortlist' ? '#0E0E0F' : '#E3E3E3', borderRadius: '20px', flexShrink: 0, cursor: 'pointer' }}>Shortlist ({safeShortlist.length})</button>
            <button onClick={() => setDbSubTab('matches')} style={{ padding: '8px 16px', border: 'none', fontSize: '13px', backgroundColor: dbSubTab === 'matches' ? '#A8C7FA' : '#1E1F22', color: dbSubTab === 'matches' ? '#0E0E0F' : '#E3E3E3', borderRadius: '20px', flexShrink: 0, cursor: 'pointer' }}>Storico ({safeMatches.length})</button>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input type="file" accept=".xlsx, .xlsm" ref={excelInputRef} onChange={handleExcelUpload} style={{ display: 'none' }} />
            <button onClick={() => excelInputRef.current.click()} disabled={isUploading} style={{ backgroundColor: '#282A2C', color: '#A8C7FA', border: 'none', padding: '8px 16px', fontSize: '12px', borderRadius: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
               <FileSpreadsheet size={14} /> Importa Excel
            </button>
            
            <input type="file" accept="image/*" multiple ref={fileInputRef} onChange={handleImageUploadOCR} style={{ display: 'none' }} />
            <button onClick={() => fileInputRef.current.click()} disabled={isUploading} style={{ backgroundColor: '#282A2C', color: '#A8C7FA', border: 'none', padding: '8px 16px', fontSize: '12px', borderRadius: '20px', cursor: isUploading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ImageIcon size={14} /> {isUploading ? 'Scansione...' : 'Foto Rosa'}
            </button>

            {safePlayers.length > 0 && <button onClick={handleClearAllData} style={{ backgroundColor: 'transparent', border: '1px solid #F28B82', color: '#F28B82', padding: '8px 16px', fontSize: '12px', borderRadius: '20px', cursor: 'pointer' }}>Azzera DB</button>}
          </div>

        </div>

        <div style={{ flex: 1, padding: '24px', overflowY: 'auto', boxSizing: 'border-box' }}>
          
          {isUploading && (dbSubTab === 'first_team' || dbSubTab === 'youth') ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#A8C7FA', fontSize: '14px', backgroundColor: '#1E1F22', borderRadius: '16px' }}>
              <Sparkles size={24} style={{ marginBottom: '10px' }} />
              <div>{uploadProgressText}</div>
            </div>
          ) : dbSubTab === 'shortlist' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {safeShortlist.length === 0 ? <div style={{ color: '#8E918F', textAlign: 'center', padding: '40px' }}>Shortlist vuota.</div> : safeShortlist.map((s, i) => (
                <div key={s?.id || i} style={{ backgroundColor: '#1E1F22', padding: '16px', borderRadius: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '16px', fontWeight: '500', color: '#E3E3E3' }}>{s?.name || 'Sconosciuto'}</span>
                    <span style={{ backgroundColor: '#282A2C', color: '#A8C7FA', fontSize: '11px', padding: '4px 10px', borderRadius: '12px' }}>{s?.verdict || 'VAGLIATO'}</span>
                  </div>
                  <div style={{ color: '#8E918F', fontSize: '13px', marginBottom: '6px' }}>{s?.position || 'N/D'}</div>
                  <div style={{ color: '#E3E3E3', fontSize: '14px', whiteSpace: 'pre-line' }}>{s?.analysis || ''}</div>
                </div>
              ))}
            </div>
          ) : dbSubTab === 'matches' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {safeMatches.length === 0 ? <div style={{ color: '#8E918F', textAlign: 'center', padding: '40px' }}>Nessuna partita archiviata.</div> : safeMatches.map((m, i) => (
                <div key={m?.id || i} style={{ backgroundColor: '#1E1F22', padding: '16px', borderRadius: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '16px', fontWeight: '500', color: '#E3E3E3' }}>SORA vs {m?.opponent?.toUpperCase() || 'AVV.'}</span>
                    <span style={{ backgroundColor: '#282A2C', color: '#E3E3E3', fontSize: '13px', padding: '4px 10px', borderRadius: '12px' }}>{m?.result || 'N/D'}</span>
                  </div>
                  <div style={{ color: '#8E918F', fontSize: '13px', marginBottom: '6px' }}>xG {m?.xg_team || '-'} - {m?.xg_opp || '-'} xG Subiti</div>
                  <div style={{ color: '#E3E3E3', fontSize: '14px', whiteSpace: 'pre-line' }}>{m?.analysis || ''}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ backgroundColor: '#1E1F22', borderRadius: '16px', overflowX: 'auto', width: '100%' }}>
              {sortedList.length === 0 ? <div style={{ textAlign: 'center', padding: '40px', color: '#8E918F' }}>Nessun giocatore. Importa un Excel o scansiona le foto.</div> : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #282A2C' }}>
                      <th onClick={() => handleSort('name')} style={{ padding: '16px', color: '#8E918F', cursor: 'pointer', fontSize: '12px', fontWeight: 'normal' }}>Nome</th>
                      <th onClick={() => handleSort('position')} style={{ padding: '16px', color: '#8E918F', cursor: 'pointer', fontSize: '12px', fontWeight: 'normal' }}>Ruolo</th>
                      <th onClick={() => handleSort('age')} style={{ padding: '16px', color: '#8E918F', cursor: 'pointer', textAlign: 'center', fontSize: '12px', fontWeight: 'normal' }}>Età</th>
                      <th onClick={() => handleSort('pres')} style={{ padding: '16px', color: '#8E918F', cursor: 'pointer', textAlign: 'center', fontSize: '12px', fontWeight: 'normal' }}>Pres</th>
                      <th onClick={() => handleSort('gol')} style={{ padding: '16px', color: '#8E918F', cursor: 'pointer', textAlign: 'center', fontSize: '12px', fontWeight: 'normal' }}>Gol</th>
                      <th onClick={() => handleSort('mv')} style={{ padding: '16px', color: '#8E918F', cursor: 'pointer', textAlign: 'center', fontSize: '12px', fontWeight: 'normal' }}>M.V.</th>
                      <th style={{ padding: '16px', width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedList.map((p, idx) => {
                      const mv = parseFloat(String(p?.attributes?.['Media Voto'] || '0').replace(',', '.'));
                      const mvColor = mv < 6.70 ? '#F28B82' : (mv > 7.10 ? '#81C995' : '#E3E3E3');
                      return (
                        <tr key={p?.id || idx} onClick={(e) => handleSelectPlayer(p, e)} style={{ borderBottom: '1px solid #282A2C', cursor: 'pointer', backgroundColor: selectedProfile?.id === p?.id ? '#282A2C' : 'transparent', transition: 'background 0.2s' }}>
                          <td style={{ padding: '16px', color: '#E3E3E3', fontSize: '14px' }}>{p?.name || '-'} {p?.notes && <span style={{ fontSize: '10px', backgroundColor: '#A8C7FA', color: '#0E0E0F', padding: '2px 6px', borderRadius: '10px', marginLeft: '6px' }}>NOTE</span>}</td>
                          <td style={{ padding: '16px', color: '#A8C7FA', fontSize: '13px' }}>{p?.position || 'N/D'}</td>
                          <td style={{ padding: '16px', textAlign: 'center', color: '#8E918F', fontSize: '13px' }}>{p?.age || '-'}</td>
                          <td style={{ padding: '16px', textAlign: 'center', color: '#E3E3E3', fontSize: '13px' }}>{p?.attributes?.Presenze || '-'}</td>
                          <td style={{ padding: '16px', textAlign: 'center', color: '#E3E3E3', fontSize: '13px' }}>{p?.attributes?.Gol || '-'}</td>
                          <td style={{ padding: '16px', textAlign: 'center', color: mvColor, fontWeight: '500', fontSize: '13px' }}>{p?.attributes?.['Media Voto'] || '-'}</td>
                          <td style={{ padding: '16px', textAlign: 'center' }}>
                            <button onClick={(e) => { e.stopPropagation(); handleDeletePlayer(p.id); }} style={{ background: 'none', border: 'none', color: '#F28B82', cursor: 'pointer' }} title="Elimina">
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

  // NAVIGAZIONE
  const navContainerStyle = isMobile 
    ? { position: 'fixed', bottom: 0, left: 0, right: 0, height: '70px', width: '100%', backgroundColor: '#0E0E0F', borderTop: '1px solid #1E1F22', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', padding: '0 10px', zIndex: 1000 } 
    : { width: '80px', backgroundColor: '#0E0E0F', borderRight: '1px solid #1E1F22', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '24px', gap: '20px', zIndex: 10 };
  
  const navButtonStyle = (room) => ({ background: activeRoom === room ? '#1E1F22' : 'none', border: 'none', color: activeRoom === room ? '#A8C7FA' : '#8E918F', padding: '12px', borderRadius: '16px', cursor: 'pointer', transition: 'all 0.2s' });

  return (
    <div style={{ display: 'flex', height: '100vh', flexDirection: isMobile ? 'column' : 'row', backgroundColor: '#0E0E0F', color: '#E3E3E3', fontFamily: 'system-ui, -apple-system, sans-serif', overflow: 'hidden' }}>
      
      <div style={navContainerStyle}>
        {!isMobile && <div style={{ width: '48px', height: '48px', backgroundColor: '#A8C7FA', display: 'flex', alignItems: 'center', color: '#0E0E0F', fontWeight: '600', fontSize: '18px', borderRadius: '16px', justifyContent: 'center', marginBottom: '10px' }}><Sparkles size={20}/></div>}
        <button onClick={() => handleSidebarClick('board')} style={navButtonStyle('board')} title="Direzione"><Users size={22} /></button>
        <button onClick={() => handleSidebarClick('vice')} style={navButtonStyle('vice')} title="Vice Allenatore"><MessageSquare size={22} /></button>
        <button onClick={() => handleSidebarClick('database')} style={navButtonStyle('database')} title="Database"><Database size={22} /></button>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingBottom: isMobile ? '70px' : '0px' }}>
        {activeRoom !== 'database' && renderChatWindow()}
        {activeRoom === 'database' && renderMasterDatabase()}
      </div>

      {/* FLYOUT MODALE: REFERTO TATTICO */}
      {selectedTacticReport && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(14, 14, 15, 0.8)', backdropFilter: 'blur(8px)', zIndex: 99999, display: 'flex', padding: isMobile ? '16px' : '40px' }}>
          <div style={{ margin: 'auto', width: '100%', maxWidth: '700px', backgroundColor: '#1E1F22', borderRadius: '24px', padding: '32px', display: 'flex', flexDirection: 'column', maxHeight: '90vh', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '500', color: '#E3E3E3' }}>{selectedTacticReport?.title || 'Tattica'}</h3>
              <button onClick={() => setSelectedTacticReport(null)} style={{ background: '#282A2C', border: 'none', color: '#8E918F', cursor: 'pointer', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} /></button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', fontSize: '15px', color: '#E3E3E3', lineHeight: '1.6' }}>
              {formatMessageContent(selectedTacticReport?.content || '')}
            </div>
          </div>
        </div>
      )}

      {/* FLYOUT: FASCICOLO CALCIATORE */}
      {selectedProfile && (
        <div style={{ position: 'fixed', right: isMobile ? '10px' : '24px', bottom: isMobile ? '80px' : '24px', left: isMobile ? '10px' : 'auto', width: isMobile ? 'calc(100% - 20px)' : '360px', backgroundColor: '#1E1F22', padding: '24px', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', zIndex: 5000, boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
            <div>
              <h4 style={{ fontSize: '20px', color: '#E3E3E3', margin: '0', fontWeight: '500' }}>{selectedProfile?.name || '-'}</h4>
              <span style={{ fontSize: '13px', color: '#A8C7FA' }}>{selectedProfile?.position || 'N/D'}</span>
            </div>
            <button onClick={() => setSelectedProfile(null)} style={{ background: '#282A2C', border: 'none', color: '#8E918F', cursor: 'pointer', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', padding: '10px 0', borderBottom: '1px solid #282A2C' }}>
              <span style={{ color: '#8E918F' }}>Età</span><span style={{ color: '#E3E3E3' }}>{selectedProfile?.age || 'N/D'}</span>
            </div>
            
            {selectedProfile?.attributes && Object.entries(selectedProfile.attributes).map(([key, val]) => {
               const numVal = parseInt(val);
               let valColor = '#81C995'; 
               if (!isNaN(numVal)) {
                 if (numVal < 10) valColor = '#F28B82';
                 else if (numVal >= 15) valColor = '#A8C7FA';
               }
               return (
                 <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', padding: '10px 0', borderBottom: '1px solid #282A2C' }}>
                   <span style={{ color: '#8E918F' }}>{key}</span><span style={{ color: valColor, fontWeight: '500' }}>{String(val)}</span>
                 </div>
               );
            })}
            
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', color: '#E3E3E3', fontWeight: '500' }}>Note del Mister</label>
              <textarea value={editingNotes} onChange={(e) => setEditingNotes(e.target.value)} placeholder="Aggiungi una nota..." style={{ width: '100%', height: '80px', backgroundColor: '#0E0E0F', border: 'none', padding: '12px', color: '#E3E3E3', fontSize: '14px', borderRadius: '12px', resize: 'none', boxSizing: 'border-box' }} />
              <button onClick={handleSavePlayerNotes} disabled={isSavingNotes} style={{ backgroundColor: '#A8C7FA', color: '#0E0E0F', border: 'none', padding: '12px', fontSize: '13px', fontWeight: '500', borderRadius: '20px', cursor: 'pointer' }}>{isSavingNotes ? 'Salvataggio...' : 'Salva Note'}</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
