import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient'
import { MessageSquare, Database, Send, Users, Sliders, TrendingUp, ImageIcon, X, Briefcase, ChevronRight, HelpCircle, Award, Activity, Search, Trash2, ChevronDown, FileSpreadsheet } from 'lucide-react'
import { GoogleGenerativeAI } from '@google/generative-ai'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// ==========================================
// IL CERVELLO DI FM26 (ANIMA CALCISTICA PROFONDA)
// ==========================================
const FM26_CORE_ENGINE = `
Sei il Vice Allenatore del club in Football Manager 2026. Sei il braccio destro del Mister (Omiserez) e un profondo conoscitore di calcio e tattica.

[!!! STILE DI CONVERSAZIONE E IDENTITÀ !!!]
1. COMPAGNO DI PANCHINA: Sei la mia spalla destra. Parla con me ESATTAMENTE come un'intelligenza artificiale avanzata (amichevole, intelligente, discorsiva, empatica ma schietta), ma calata nel ruolo di un vero uomo di campo. Niente risposte telegrafiche o robotiche. Voglio dialogare di calcio con te in modo naturale.
2. ANALISI TATTICA PROFONDA: Quando parliamo di moduli, giocatori o avversari, entra nei dettagli. Valuta i pro e i contro, ragiona sulle mie scelte, dimmi sinceramente se sbaglio e proponi alternative intelligenti e realistiche.
3. USA I DATI MA CON NATURALEZZA: Sfrutta i dati della rosa (attributi, media voto, presenze) per giustificare le tu idee, ma parlane in modo fluido. Es: "Mister, con quel 10 in Passaggi, non so se può fare il Regista...".
4. NIENTE CODICE O LAVAGNE: Non stampare mai codice JSON, tabelle ASCII o lavagne visive. Voglio solo testo ben formattato, leggibile e chiaro.
5. TERMINOLOGIA: Usa i nomi dei ruoli in inglese (es: **Box to Box Midfielder**, **Inverted Winger**), ma discuti in italiano.
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
  const [messages, setMessages] = useState(() => { if (typeof window !== 'undefined') { try { return JSON.parse(localStorage.getItem('hq_messages')) || [{ sender_role: 'system', content: 'Cervello tattico sbloccato. Sezione Storia Club integrata correttamente.' }]; } catch(e) { return [{ sender_role: 'system', content: 'Centrale operativa allineata.' }]; } } return []; })
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
      <div style={{ backgroundColor: '#090710', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#da1b60', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <h1 style={{ fontWeight: '900', textTransform: 'uppercase', fontSize: '24px' }}>Avvio Segreteria...</h1>
        <p style={{ color: '#64748b' }}>Sincronizzazione Database in corso</p>
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
        if (part.startsWith('**') && part.endsWith('**')) { return <strong key={i} style={{ color: '#22d3ee', fontWeight: '900' }}>{part.slice(2, -2)}</strong>; }
        return <span key={i}>{part}</span>;
      });

      if (isHeader || isSubHeader) return <div key={index} style={{ marginTop: '14px', marginBottom: '8px', fontSize: '1.1em', fontWeight: '900', color: '#a855f7', borderBottom: '1px solid #231b3a', paddingBottom: '4px' }}>{renderedParts}</div>;
      if (isList) return <div key={index} style={{ display: 'flex', gap: '8px', marginTop: '6px', paddingLeft: '12px' }}><span style={{ color: '#da1b60', fontWeight: 'bold' }}>•</span><div style={{ flex: 1 }}>{renderedParts}</div></div>;
      return <div key={index} style={{ marginTop: '4px', minHeight: '14px' }}>{renderedParts}</div>;
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

  async function handleForceSync() {
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
        instructionPrompt += `\n\nIL MISTER TI HA ALLEGATO ${imagesToSend.length} IMMAGINI E DICE: "${currentInputText || 'Analizza questi screen, Mister.'}"`;
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
      `\n\n[!!! ECCEZIONE ALLA REGOLA DELLA SINTESI !!!]
      STUDIA QUESTA TATTICA O GUIDA: """${inputBuffer}""". 
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
      `\n\n[!!! ECCEZIONE ALLA REGOLA DELLA SINTESI !!!]
      Il Mister ti ha inviato gli SCREENSHOT della tattica.
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
          const reader = new FileReader(); reader.onloadend = () => resolve(reader.result.split(',')[1]); reader.readAsDataURL(file);
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
          
          // MAPPA UNIVERSALE DELLE STATISTICHE PER LA UI DI APPRENDIMENTO AUTOMATICO
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
        console.error(error); setUploadProgressText("❌ Errore file Excel.");
      } platformFinally: {
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
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#0d0a16', width: '100%', height: '100%', position: 'relative' }}>
        <div style={{ height: '75px', padding: '0 24px', borderBottom: '2px solid #231b3a', display: 'flex', alignItems: 'center', backgroundColor: '#140f24', justifyContent: 'space-between', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <MessageSquare size={24} color="#da1b60" /> 
            <h2 style={{ fontSize: isMobile ? '16px' : '22px', color: '#ffffff', margin: 0, textTransform: 'uppercase', fontWeight: '900' }}>
              {activeRoom === 'board' ? '🏛️ DIRETTA PLENARIA' : `🧠 VICE ALLENATORE`}
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
                    <span style={{ fontSize: '11px', color: '#475569', fontWeight: 'bold', marginBottom: '4px' }}>IL VICE STA PENSANDO...</span>
                    <div style={{ padding: '14px', fontSize: '15px', backgroundColor: '#140f24', color: '#64748b', borderLeft: '4px solid #475569', borderRadius: '6px', fontStyle: 'italic' }}>Elaborazione dati in corso...</div>
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
                  <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder={pendingImages.length > 0 ? "Aggiungi un commento alle foto..." : "Scrivi in chat o allega foto veloci..."} style={{ width: '100%', backgroundColor: '#090710', border: '2px solid #231b3a', padding: '16px 90px 16px 42px', fontSize: '16px', color: '#ffffff', borderRadius: '8px', outline: 'none', fontWeight: '500' }} />
                  <div style={{ position: 'absolute', right: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button onClick={() => chatImageInputRef.current.click()} disabled={isTyping} style={{ background: 'none', border: 'none', color: '#a855f7', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }} title="Allega Screen Rapido"><ImageIcon size={22} /></button>
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
                  <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#a855f7', borderBottom: '2px solid #231b3a', paddingBottom: '8px', margin: 0, fontWeight: '900' }}>Identità Societaria</h3>
                  <div style={{ backgroundColor: '#1d1433', border: '2px solid #a855f7', padding: '16px', borderRadius: '6px' }}>
                    <label style={{ fontSize: '12px', color: '#e2e8f0', textTransform: 'uppercase', display: 'block', marginBottom: '8px', fontWeight: '900' }}>🎯 Progetto e Visione a Lungo Termine</label>
                    <textarea value={clubVision} onChange={(e) => setClubVision(e.target.value)} placeholder="Voglio creare un ecosistema stile Barcellona..." style={{ width: '100%', height: '80px', backgroundColor: '#090710', border: '1px solid #231b3a', padding: '12px', color: '#ffffff', fontSize: '14px', resize: 'none', borderRadius: '6px', boxSizing: 'border-box', lineHeight: '1.5' }} />
                  </div>

                  {/* NUOVA SEZIONE INSERIMENTO STORIA CLUB */}
                  <div style={{ backgroundColor: '#140f24', border: '1px solid #231b3a', padding: '16px', borderRadius: '6px', marginTop: '10px' }}>
                    <label style={{ fontSize: '12px', color: '#e2e8f0', textTransform: 'uppercase', display: 'block', marginBottom: '8px', fontWeight: '900' }}>📜 Storia e Albo d'Oro del Club</label>
                    <textarea value={clubHistory} onChange={(e) => setClubHistory(e.target.value)} placeholder="Incolla o scrivi la storia del Sora, i campionati vinti, i piazzamenti storici e le leggende del club..." style={{ width: '100%', height: '100px', backgroundColor: '#090710', border: '1px solid #231b3a', padding: '12px', color: '#ffffff', fontSize: '14px', resize: 'vertical', borderRadius: '6px', boxSizing: 'border-box', lineHeight: '1.5' }} />
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
                  <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#22d3ee', borderBottom: '2px solid #231b3a', paddingBottom: '8px', margin: 0, fontWeight: '900' }}>🛠️ Strumenti del Vice</h3>

                  <div style={{ backgroundColor: '#1d1433', border: '2px solid #f43f5e', padding: '14px', borderRadius: '6px', marginTop: '10px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '900', color: '#fff', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>📂 Archivia Documenti Societari</span>
                    <input type="file" accept="image/*" multiple ref={genericUploadRef} onChange={handleGenericDocsUpload} style={{ display: 'none' }} />
                    <button onClick={() => genericUploadRef.current.click()} disabled={isUploading} style={{ width: '100%', backgroundColor: '#f43f5e', color: '#fff', border: 'none', padding: '14px', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <Database size={18} /> {isUploading ? '⏳ Archiviazione...' : 'Carica Finanze/Partite/Scout'}
                    </button>
                    {uploadProgressText && <div style={{ fontSize: '12px', color: '#fbbf24', marginTop: '8px', fontWeight: 'bold', textAlign: 'center' }}>{uploadProgressText}</div>}
                  </div>
                  
                  <div style={{ backgroundColor: '#140f24', border: '1px solid #231b3a', padding: '14px', borderRadius: '6px', marginTop: '10px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#fff', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>🧠 Apprendimento Tattico</span>
                    
                    <textarea value={externalTacticInput} onChange={(e) => setExternalTacticInput(e.target.value)} placeholder="Incolla il testo di una guida tattica..." style={{ width: '94%', height: '100px', backgroundColor: '#090710', border: '1px solid #231b3a', padding: '12px', color: '#ffffff', fontSize: '14px', resize: 'vertical', borderRadius: '6px', marginBottom: '8px' }} />
                    <button onClick={handleAnalyzeExternalTactic} disabled={isTyping || !externalTacticInput.trim()} style={{ backgroundColor: '#22d3ee', color: '#0f0b1b', border: 'none', padding: '10px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', borderRadius: '6px', cursor: 'pointer', width: '100%', marginBottom: '12px' }}>Studia Tattica da Testo</button>
                    
                    <div style={{ borderTop: '1px dashed #231b3a', margin: '12px 0' }}></div>
                    
                    <input type="file" accept="image/*" multiple ref={tacticImageUploadRef} onChange={handleTacticImagesUpload} style={{ display: 'none' }} />
                    <button onClick={() => tacticImageUploadRef.current.click()} disabled={isTyping} style={{ backgroundColor: '#a855f7', color: '#fff', border: 'none', padding: '10px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', borderRadius: '6px', cursor: 'pointer', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <ImageIcon size={16} /> Studia Tattica da Screenshot
                    </button>
                  </div>

                  <div style={{ marginTop: '15px', backgroundColor: '#140f24', padding: '14px', borderRadius: '8px', border: '1px solid #231b3a' }}>
                    <span style={{ fontSize: '11px', color: '#22d3ee', fontWeight: 'bold', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>📂 Archivio Tattiche Studiate:</span>
                    {(!Array.isArray(tacticReports) || tacticReports.length === 0) ? <div style={{ fontSize: '12px', color: '#475569', fontStyle: 'italic' }}>Nessun report salvato.</div> : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {tacticReports.map((rep, idx) => (
                          <div key={rep?.id || idx} style={{ display: 'flex', gap: '6px' }}>
                            <button onClick={() => setSelectedTacticReport(rep)} style={{ flex: 1, textAlign: 'left', backgroundColor: '#090710', border: '1px solid #231b3a', padding: '12px', borderRadius: '6px', color: '#fff', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold' }}>⚡ {rep?.title || 'Tattica'}</button>
                            <button onClick={() => handleDeleteTacticReport(rep.id)} style={{ background: 'none', border: '1px solid #231b3a', backgroundColor: '#090710', color: '#ef4444', cursor: 'pointer', borderRadius: '6px', padding: '0 12px' }} title="Elimina Tattica">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ backgroundColor: '#140f24', border: '1px solid #231b3a', padding: '14px', borderRadius: '6px', marginTop: '10px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#fff', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>💰 Simulatore Ammortamento</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input type="number" value={simCost} onChange={(e) => setSimCost(e.target.value)} placeholder="Costo" style={{ width: '45%', backgroundColor: '#090710', border: '1px solid #231b3a', padding: '8px', color: '#fff', fontSize: '12px', borderRadius: '4px' }} />
                      <input type="number" value={simWage} onChange={(e) => setSimWage(e.target.value)} placeholder="Stip." style={{ width: '45%', backgroundColor: '#090710', border: '1px solid #231b3a', padding: '8px', color: '#fff', fontSize: '12px', borderRadius: '4px' }} />
                    </div>
                    <button onClick={handleSimulateTransfer} style={{ backgroundColor: '#10b981', color: '#0f0c1b', border: 'none', padding: '10px', fontSize: '12px', fontWeight: 'bold', borderRadius: '4px', marginTop: '10px', width: '100%', cursor: 'pointer' }}>Calcola Impatto</button>
                    {simResult && <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#090710', borderLeft: `3px solid ${simResult.color}`, fontSize: '12px', color: '#fff' }}>{simResult.notes}</div>}
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
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#0f0c1b', height: '100%', overflow: 'hidden', width: '100%' }}>
        <div style={{ height: 'auto', minHeight: '75px', padding: '12px 16px', borderBottom: '2px solid #231b3a', display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', backgroundColor: '#161224', justifyContent: 'space-between', gap: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>
          <div style={{ display: 'flex', gap: '8px', backgroundColor: '#090710', padding: '6px', border: '1px solid #231b3a', borderRadius: '6px', overflowX: 'auto', width: isMobile ? '100%' : 'auto' }}>
            <button onClick={() => setDbSubTab('first_team')} style={{ padding: '8px 16px', border: 'none', fontSize: '13px', fontWeight: 'bold', backgroundColor: dbSubTab === 'first_team' ? '#da1b60' : 'transparent', color: '#fff', borderRadius: '4px', flexShrink: 0, cursor: 'pointer' }}>Prima Squadra ({firstTeamPlayers.length})</button>
            <button onClick={() => setDbSubTab('youth')} style={{ padding: '8px 16px', border: 'none', fontSize: '13px', fontWeight: 'bold', backgroundColor: dbSubTab === 'youth' ? '#ffaa00' : 'transparent', color: '#fff', borderRadius: '4px', flexShrink: 0, cursor: 'pointer' }}>Under 20 ({youthPlayers.length})</button>
            <button onClick={() => setDbSubTab('shortlist')} style={{ padding: '8px 16px', border: 'none', fontSize: '13px', fontWeight: 'bold', backgroundColor: dbSubTab === 'shortlist' ? '#f43f5e' : 'transparent', color: '#fff', borderRadius: '4px', flexShrink: 0, cursor: 'pointer' }}>🎯 Shortlist ({safeShortlist.length})</button>
            <button onClick={() => setDbSubTab('matches')} style={{ padding: '8px 16px', border: 'none', fontSize: '13px', fontWeight: 'bold', backgroundColor: dbSubTab === 'matches' ? '#3b82f6' : 'transparent', color: '#fff', borderRadius: '4px', flexShrink: 0, cursor: 'pointer' }}>🏆 Storico ({safeMatches.length})</button>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input type="file" accept=".xlsx, .xlsm" ref={excelInputRef} onChange={handleExcelUpload} style={{ display: 'none' }} />
            <button onClick={() => excelInputRef.current.click()} disabled={isUploading} style={{ backgroundColor: '#10b981', color: '#0f0b1b', border: 'none', padding: '10px 16px', fontSize: '12px', fontWeight: 'bold', borderRadius: '6px', cursor: isUploading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
               <FileSpreadsheet size={16} /> Excel (.xlsm/.xlsx)
            </button>

            <input type="file" accept="image/*" multiple ref={fileInputRef} onChange={handleImageUploadOCR} style={{ display: 'none' }} />
            <button onClick={() => fileInputRef.current.click()} disabled={isUploading} style={{ backgroundColor: isUploading ? '#fbbf24' : '#da1b60', color: isUploading ? '#0f0c1b' : '#fff', border: 'none', padding: '10px 20px', fontSize: '12px', fontWeight: 'bold', borderRadius: '6px', cursor: isUploading ? 'not-allowed' : 'pointer' }}>
              {isUploading ? '⏳ SCANSIONE...' : 'Carica Foto Rosa'}
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
              {safeShortlist.length === 0 ? <div style={{ color: '#475569', textAlign: 'center', padding: '40px' }}>Lista desideri vuota. Il Vice la aggiornerà appena valuterà i tuoi screen.</div> : safeShortlist.map((s, i) => (
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
              {safeMatches.length === 0 ? <div style={{ color: '#475569', textAlign: 'center', padding: '40px' }}>Nessuna partita a referto. Manda gli screen del Data Hub in chat.</div> : safeMatches.map((m, i) => (
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
              {sortedList.length === 0 ? <div style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>Nessun calciatore in archivio. Clicca su "Carica Foto Rosa".</div> : (
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

  const navContainerStyle = isMobile ? { position: 'fixed', bottom: 0, left: 0, right: 0, height: '70px', width: '100%', backgroundColor: '#140f24', borderTop: '2px solid #231b3a', display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '0 10px', gap: '14px', overflowX: 'auto', zIndex: 1000 } : { width: '90px', backgroundColor: '#140f24', borderRight: '2px solid #231b3a', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '20px', gap: '16px', zIndex: 10 };
  const navButtonStyle = (room, color) => ({ background: activeRoom === room ? '#271e44' : 'none', border: activeRoom === room ? `2px solid ${color}` : '2px solid transparent', color: activeRoom === room ? color : '#475569', padding: '10px', borderRadius: '10px', cursor: 'pointer', flexShrink: 0 });

  return (
    <div style={{ display: 'flex', height: '100vh', flexDirection: isMobile ? 'column' : 'row', backgroundColor: '#090710', color: '#cbd5e1', fontFamily: 'system-ui, -apple-system, sans-serif', overflow: 'hidden' }}>
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
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button onClick={() => setSelectedTacticReport(null)} style={{ flex: 1, backgroundColor: '#22d3ee', color: '#000', border: 'none', padding: '14px', fontSize: '14px', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer' }}>Chiudi Documento</button>
            </div>
          </div>
        </div>
      )}

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
              <span style={{ color: '#94a3b8' }}>Ruolo</span><span style={{ color: '#22d3ee', fontWeight: '900' }}>{selectedProfile?.position || 'N/D'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', padding: '8px 12px', backgroundColor: '#090710', borderRadius: '6px' }}>
              <span style={{ color: '#94a3b8' }}>Età</span><span style={{ color: '#ffffff', fontWeight: '900' }}>{selectedProfile?.age || 'N/D'}</span>
            </div>
            
            {selectedProfile?.attributes && Object.entries(selectedProfile.attributes).map(([key, val]) => {
               const numVal = parseInt(val);
               let valColor = '#34d399'; 
               if (!isNaN(numVal)) {
                 if (numVal < 10) valColor = '#ef4444';
                 else if (numVal >= 15) valColor = '#22d3ee';
               }
               return (
                 <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '6px 12px', backgroundColor: '#090710', borderRadius: '4px', borderBottom: '1px solid #140f24' }}>
                   <span style={{ color: '#cbd5e1' }}>{key}</span><span style={{ color: valColor, fontWeight: '900' }}>{String(val)}</span>
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
