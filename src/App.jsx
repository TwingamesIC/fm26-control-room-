import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient'
import { MessageSquare, Database, Settings, Send, Users, Sliders, TrendingUp, ImageIcon, X, CloudOff, Briefcase, ChevronRight, HelpCircle, Award, Activity, Search } from 'lucide-react'
import { GoogleGenerativeAI } from '@google/generative-ai'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

function App() {
  // CONFIGURAZIONE STANZE E SOTTO-TAB MASTER DATABASE
  const [activeRoom, setActiveRoom] = useState('board') 
  const [dbSubTab, setDbSubTab] = useState('first_team') 
  
  // ORDINAMENTO LOGICO TABELLE
  const [sortField, setSortField] = useState('name')
  const [sortDirection, setSortDirection] = useState('asc')

  // DETECTOR SMARTPHONE REATTIVO
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  const [mobileViewTab, setMobileViewTab] = useState('chat')

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // STATI STRUTTURALI COMPLETI (LOCALSTORAGE + LIVE CLOUD SUPABASE)
  const [clubName, setClubName] = useState(() => localStorage.getItem('hq_club_name') || 'Sora')
  const [players, setPlayers] = useState(() => JSON.parse(localStorage.getItem('hq_players')) || [])
  const [shortlist, setShortlist] = useState(() => JSON.parse(localStorage.getItem('hq_shortlist')) || [])
  const [matches, setMatches] = useState(() => JSON.parse(localStorage.getItem('hq_matches')) || [])
  const [messages, setMessages] = useState(() => JSON.parse(localStorage.getItem('hq_messages')) || [
    { sender_role: 'system', content: 'Centrale operativa allineata con i moduli Shortlist, Match Analyst e Note Giocatore attivi.' }
  ])

  // NUOVO STATO PER L'ARCHIVIO RAPIDO DELLE TATTICHE CON ACCESSO DIRETTO SENZA SCORRERE
  const [tacticReports, setTacticReports] = useState(() => JSON.parse(localStorage.getItem('hq_tactic_reports')) || [])
  const [selectedTacticReport, setSelectedTacticReport] = useState(null)
  
  const [finances, setFinances] = useState(() => {
    const local = localStorage.getItem('hq_finances');
    return local ? JSON.parse(local) : { balance: 2500000, transfer_budget: 800000, wage_budget: 15000 };
  })

  const [personality, setPersonality] = useState(() => localStorage.getItem('hq_coach_personality') || 'professional')

  // PARAMETRI SIMULATORE FINANZIARIO MONEYBALL
  const [simCost, setSimCost] = useState('500000')
  const [simWage, setSimWage] = useState('2000')
  const [simYears, setSimYears] = useState('3')
  const [simResult, setSimResult] = useState(null)

  // BUFFER INPUT TATTICI ESTERNI
  const [externalTacticInput, setExternalTacticInput] = useState('')

  // GESTIONE DEI FASCICOLI DI BORDO INTERNI
  const [selectedProfile, setSelectedProfile] = useState(null) 
  const [editingNotes, setEditingNotes] = useState('')
  const [isSavingNotes, setIsSavingNotes] = useState(false)

  const [isUploading, setIsUploading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [cloudStatus, setCloudStatus] = useState('online') 
  const [uploadError, setUploadError] = useState(null)

  const fileInputRef = useRef(null)
  const pressInputRef = useRef(null)
  const youthInputRef = useRef(null)
  const financeInputRef = useRef(null)
  const analystInputRef = useRef(null)
  const scoutInputRef = useRef(null)
  const chatContainerRef = useRef(null)

  // PERSISTENZA LOCAL STORAGE FAIL-SAFE
  useEffect(() => { localStorage.setItem('hq_players', JSON.stringify(players)) }, [players])
  useEffect(() => { localStorage.setItem('hq_shortlist', JSON.stringify(shortlist)) }, [shortlist])
  useEffect(() => { localStorage.setItem('hq_matches', JSON.stringify(matches)) }, [matches])
  useEffect(() => { localStorage.setItem('hq_tactic_reports', JSON.stringify(tacticReports)) }, [tacticReports])
  useEffect(() => { localStorage.setItem('hq_messages', JSON.stringify(messages)) }, [messages])
  useEffect(() => { localStorage.setItem('hq_finances', JSON.stringify(finances)) }, [finances])
  useEffect(() => { localStorage.setItem('hq_coach_personality', personality) }, [personality])
  
  useEffect(() => {
    localStorage.setItem('hq_club_name', clubName)
    fetchCloudData()
  }, [clubName])

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isTyping])

  // SINCRONIZZAZIONE DI RETE GLOBALE DEL DATABASE SOCIETARIO
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
      
      setCloudStatus('online')
    } catch (err) {
      setCloudStatus('offline')
    }
  }

  async function updateFinancesCloud(field, value) {
    const numValue = parseFloat(value) || 0;
    const updatedFinances = { ...finances, [field]: numValue };
    setFinances(updatedFinances);
    try {
      await supabase.from('club_finances').update({ [field]: numValue }).eq('id', 1);
    } catch (e) { setCloudStatus('offline') }
  }

  // SCRITTURA NOTE DI BORDO GIOCATORE
  async function handleSavePlayerNotes() {
    if (!selectedProfile) return;
    setIsSavingNotes(true);
    try {
      const updatedPlayers = players.map(p => p.id === selectedProfile.id ? { ...p, notes: editingNotes } : p);
      setPlayers(updatedPlayers);
      setSelectedProfile(prev => ({ ...prev, notes: editingNotes }));
      
      await supabase.from('players').update({ notes: editingNotes }).eq('id', selectedProfile.id);
      
      const systemNote = { sender_role: 'system', content: `📝 Fascicolo aggiornato per ${selectedProfile.name}: "${editingNotes}"` };
      setMessages(prev => [...prev, systemNote]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingNotes(false);
    }
  }

  function handleSelectPlayer(player) {
    setSelectedProfile(player);
    setEditingNotes(player.notes || '');
  }

  function updateCoachPersonality(val) { setPersonality(val); }

  async function handleClearAllData() {
    if (window.confirm("Vuoi azzerare la sede e ricominciare la stagione da zero?")) {
      setPlayers([]); setShortlist([]); setMatches([]); setTacticReports([]);
      setMessages([{ sender_role: 'system', content: 'Centrale resettata con successo. Sede pulita.' }]);
      setFinances({ balance: 2500000, transfer_budget: 800000, wage_budget: 15000 }); setSelectedProfile(null); localStorage.clear();
      try { 
        await supabase.from('players').delete().neq('id', 0); 
        await supabase.from('shortlist').delete().neq('id', 0); 
        await supabase.from('matches').delete().neq('id', 0); 
        await supabase.from('club_messages').delete().neq('id', 0); 
      } catch(e) {}
    }
  }

  // CORE ENGINE CHAT: INTERCETTAZIONE MEMORIA STORICA INCROCIATA
  async function handleSendMessage() {
    if (!chatInput.trim()) return;
    const currentInputText = chatInput;
    setChatInput('');
    setIsTyping(true);

    const userRole = `user:${activeRoom}`;
    const userMessageObj = { sender_role: userRole, content: currentInputText };
    const updatedMessages = [...messages, userMessageObj];
    setMessages(updatedMessages);

    try { await supabase.from('club_messages').insert([userMessageObj]); } catch(e) { setCloudStatus('offline') }

    try {
      const squadContext = players.map(p => ({ nome: p.name, ruolo: p.position, stats: p.attributes, note_mister: p.notes || '' }));
      const shortlistContext = shortlist.slice(0, 15).map(s => ({ nome: s.name, ruolo: s.position, verdetto: s.verdict }));
      const matchesContext = matches.slice(0, 5).map(m => ({ avversario: m.opponent, risultato: m.result, analisi: m.analysis }));

      const businessChronology = updatedMessages.slice(-45).map(m => {
        let roleLabel = m.sender_role.toUpperCase();
        if (roleLabel.startsWith('USER:')) roleLabel = `MISTER (nella stanza ${roleLabel.split(':')[1]})`;
        return `${roleLabel}: ${m.content}`;
      }).join('\n');

      let instructionPrompt = `
        SEI LO STAFF DIRIGENZIALE ED ESPERTO DEL CLUB "${clubName.toUpperCase()}" SU FOOTBALL MANAGER 2026.
        Il tuo Mister (Omiserez) ti dice: "${currentInputText}"
        
        CRONOLOGIA E MEMORIA INTERNA AZIENDALE (RICORDA QUESTI DETTAGLI DI TUTTE LE STANZE):
        ${businessChronology}
        
        REGISTRO CONTABILE ED ORGANICO SQUADRA:
        - Cassa €${finances.balance} | Budget Mercato €${finances.transfer_budget}
        - ROSA ATTUALE (CON NOTE): ${JSON.stringify(squadContext.slice(0, 30))}
        - LISTA DESIDERI OBIETTIVI (SHORTLIST): ${JSON.stringify(shortlistContext)}
        - ULTIME GARE GIOCATE: ${JSON.stringify(matchesContext)}
      `;

      if (activeRoom === 'board') {
        instructionPrompt += `
          REGOLE TAVOLO PLENARIA: Rispondi facendo parlare a turno i 7 collaboratori (VICE ALLENATORE, DIRETTORE SPORTIVO, CHIEF SCOUT, CFO FINANZE, ADDETTO STAMPA, RESPONSABILE GIOVANILI, MATCH ANALYST).
        `;
      } else {
        instructionPrompt += `
          STANZA SINGOLA ATTIVA: SEI NELL'UFFICIO PRIVATO DI '${activeRoom.toUpperCase()}'. Rispondi interpretando solo questo ruolo a quattrocchi.
        `;
      }

      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(instructionPrompt);
      const aiMessageObj = { sender_role: activeRoom, content: result.response.text() };
      setMessages(prev => [...prev, aiMessageObj]);
      try { await supabase.from('club_messages').insert([aiMessageObj]); } catch(e) {}
    } catch (error) { console.error(error); } finally { setIsTyping(false); }
  }

  // UNIFICAZIONE MODULI MULTIMEDIALI INTELLIGENTI CON SCRITTURA LIVE IN CHAT CENTRALE
  async function handleScoutImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    setIsTyping(true);
    if (isMobile) setMobileViewTab('chat');
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result.split(',')[1];
        const imagePart = { inlineData: { data: base64Data, mimeType: file.type } };
        
        const prompt = `Sei il Capo Osservatore d'élite del club "${clubName}". Analizza questo screenshot profilo giocatore di FM26.
        Restituisci l'output strutturato ESATTAMENTE in questo modo, compilando i dati:
        VERDETTO: [Mettere qui solo un verdetto breve in maiuscolo tra ACQUISTARE, RISERVA, EVITARE]
        NOME: [Nome giocatore]
        RUOLO: [Ruolo abbreviato]
        REPORT: [Inserisci l'analisi tecnica esaustiva a caratteri giganti per il Mister]`;

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent([prompt, imagePart]);
        const output = result.response.text();

        const nomeMatch = output.match(/NOME:\s*(.*)/i);
        const ruoloMatch = output.match(/RUOLO:\s*(.*)/i);
        const verdettoMatch = output.match(/VERDETTO:\s*(.*)/i);

        const pName = nomeMatch ? nomeMatch[1].trim() : 'Obiettivo Scansionato';
        const pRole = ruoloMatch ? ruoloMatch[1].trim() : 'N/D';
        const pVerdict = verdettoMatch ? verdettoMatch[1].trim() : 'VALUTAZIONE';

        const userMsg = { sender_role: `user:scout`, content: `📷 Mister ha inoltrato la foto di un calciatore esterno da visionare.` };
        const aiMsg = { sender_role: 'scout', content: output };
        setMessages(prev => [...prev, userMsg, aiMsg]);

        const targetShortlist = { name: pName, position: pRole, verdict: pVerdict, analysis: output };
        try {
          let { data } = await supabase.from('shortlist').insert([targetShortlist]).select();
          if (data) setShortlist(prev => [data[0], ...prev]);
          await supabase.from('club_messages').insert([userMsg, aiMsg]);
        } catch(e) {}
      };
      reader.readAsDataURL(file);
    } catch (err) { console.error(err); } finally { setIsTyping(false); }
  }

  async function handlePressImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    setIsTyping(true);
    if (isMobile) setMobileViewTab('chat');
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result.split(',')[1];
        const imagePart = { inlineData: { data: base64Data, mimeType: file.type } };
        const prompt = `Sei l'Addetto Stampa del club "${clubName}". Analizza questo screenshot di conferenza su FM26. Il Mister adotta lo stile "${personality.toUpperCase()}". Spiega quale opzione di risposta scegliere per proteggere lo spogliatoio.`;
        
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent([prompt, imagePart]);
        const output = result.response.text();

        const userMsg = { sender_role: `user:press`, content: `📷 Mister ha inoltrato uno screenshot della conferenza stampa in corso.` };
        const aiMsg = { sender_role: 'press', content: output };
        setMessages(prev => [...prev, userMsg, aiMsg]);
        try { await supabase.from('club_messages').insert([userMsg, aiMsg]); } catch(e){}
      };
      reader.readAsDataURL(file);
    } catch (err) { console.error(err); } finally { setIsTyping(false); }
  }

  async function handleAnalystImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    setIsTyping(true);
    if (isMobile) setMobileViewTab('chat');
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result.split(',')[1];
        const imagePart = { inlineData: { data: base64Data, mimeType: file.type } };
        
        const prompt = `Sei il Match Analyst del club "${clubName}". Esamina lo screenshot dei dati partita o tabellino di FM26.
        Compila tassativamente questi campi strutturati per il database:
        AVVERSARIO: [Nome squadra avversaria]
        RISULTATO: [Risultato finale es: 2-1, 0-0]
        XG_TEAM: [xG prodotti da noi]
        XG_OPP: [xG prodotti dagli avversari]
        ANALISI: [Fornisci l'analisi dei flussi di gioco algoritmica da cambiare subito sui pannelli di FM]`;

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent([prompt, imagePart]);
        const output = result.response.text();

        const oppMatch = output.match(/AVVERSARIO:\s*(.*)/i);
        const resMatch = output.match(/RISULTATO:\s*(.*)/i);
        const xgTMatch = output.match(/XG_TEAM:\s*(.*)/i);
        const xgOMatch = output.match(/XG_OPP:\s*(.*)/i);

        const mOpp = oppMatch ? oppMatch[1].trim() : 'Gara di Campionato';
        const mRes = resMatch ? resMatch[1].trim() : 'N/D';
        const mXgT = xgTMatch ? xgTMatch[1].trim() : '-';
        const mXgO = xgOMatch ? xgOMatch[1].trim() : '-';

        const userMsg = { sender_role: `user:analyst`, content: `📷 Mister ha caricato il tabellino visivo del fine gara.` };
        const aiMsg = { sender_role: 'analyst', content: output };
        setMessages(prev => [...prev, userMsg, aiMsg]);

        const matchLog = { opponent: mOpp, result: mRes, xg_team: mXgT, xg_opp: mXgO, analysis: output };
        try {
          let { data } = await supabase.from('matches').insert([matchLog]).select();
          if (data) setMatches(prev => [data[0], ...prev]);
          await supabase.from('club_messages').insert([userMsg, aiMsg]);
        } catch(e) {}
      };
      reader.readAsDataURL(file);
    } catch (e) { console.error(e); } finally { setIsTyping(false); }
  }

  async function handleFinanceImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    setIsTyping(true);
    if (isMobile) setMobileViewTab('chat');
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result.split(',')[1];
        const imagePart = { inlineData: { data: base64Data, mimeType: file.type } };
        const prompt = `Sei il CFO del club "${clubName}". Estrai Cassa, Budget Mercato e Budget Ingaggi da questo screen finanziario di FM26. Rispondi SOLO con JSON puro: { "balance": numero, "transfer_budget": numero, "wage_budget": numero, "analysis": "analisi moneyball dettagliata" }`;
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent([prompt, imagePart]);
        const jsonClean = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(jsonClean);
        if (parsed) {
          setFinances({ balance: parsed.balance, transfer_budget: parsed.transfer_budget, wage_budget: parsed.wage_budget });
          
          const userMsg = { sender_role: `user:cfo`, content: `📷 Mister ha inserito il rendiconto finanziario visivo per l'audit patrimoniale.` };
          const aiMsg = { sender_role: 'cfo', content: parsed.analysis };
          setMessages(prev => [...prev, userMsg, aiMsg]);
          
          try { 
            await supabase.from('club_finances').update({ balance: parsed.balance, transfer_budget: parsed.transfer_budget, wage_budget: parsed.wage_budget }).eq('id', 1); 
            await supabase.from('club_messages').insert([userMsg, aiMsg]);
          } catch (e) {}
        }
      };
      reader.readAsDataURL(file);
    } catch (e) { console.error(e); } finally { setIsTyping(false); }
  }

  async function handleYouthImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    setIsTyping(true);
    if (isMobile) setMobileViewTab('chat');
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result.split(',')[1];
        const imagePart = { inlineData: { data: base64Data, mimeType: file.type } };
        const prompt = `Sei il Responsabile Giovanili del club "${clubName}". Esamina lo screenshot profilo Under 20 di FM26. Detta focus di allenamento perfetto per massimizzare la crescita.`;
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent([prompt, imagePart]);
        
        const userMsg = { sender_role: `user:youth`, content: `📷 Mister ha scansionato il cartellino di un giovane wonderkid del vivaio.` };
        const aiMsg = { sender_role: 'youth', content: result.response.text() };
        setMessages(prev => [...prev, userMsg, aiMsg]);
        try { await supabase.from('club_messages').insert([userMsg, aiMsg]); } catch(e){}
      };
      reader.readAsDataURL(file);
    } catch (e) { console.error(e); } finally { setIsTyping(false); }
  }

  async function handleImageUploadOCR(event) {
    const file = event.target.files[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result.split(',')[1];
        const imagePart = { inlineData: { data: base64Data, mimeType: file.type } };
        const prompt = `Analizza attentamente questa griglia tabella di Football Manager. Estrai tutti i calciatori. 
        Nota Bene: La colonna dell'età può chiamarsi "Età", "Eta", "Anni" o "Age". La colonna del valore può chiamarsi "Valore", "Val", "Value" o "Val Stimat". La colonna dell'ingaggio può essere "Ingaggio", "Stip", "Stipendio" o "Wage". La colonna della media voto può essere "Media Voto", "M.V.", "Mv" o "Av Rat".
        Rispondi SOLO array JSON puro: [ { "type": "player", "name": "Nome", "age": "num", "position": "Ruolo", "attributes": { "Gol": "num", "Media Voto": "num", "Presenze": "num", "Ingaggio": "txt", "Valore": "txt" } } ]`;
        
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent([prompt, imagePart]);
        const jsonClean = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        const extractedData = JSON.parse(jsonClean);
        
        if (Array.isArray(extractedData)) {
          setPlayers(prev => {
            const list = [...prev];
            extractedData.forEach(np => {
              const idx = list.findIndex(x => x.name.toLowerCase().trim() === np.name.toLowerCase().trim());
              if (idx >= 0) list[idx] = { ...list[idx], ...np, attributes: { ...list[idx].attributes, ...np.attributes } };
              else list.push(np);
            });
            return list;
          });
          let { data: dbPlayers } = await supabase.from('players').select('*');
          for (const p of extractedData) {
            const match = dbPlayers?.find(x => x.name.toLowerCase().trim() === p.name.toLowerCase().trim());
            if (match) await supabase.from('players').update({ age: p.age, position: p.position, attributes: { ...match.attributes, ...p.attributes } }).eq('id', match.id);
            else await supabase.from('players').insert([p]);
          }
        }
      };
      reader.readAsDataURL(file);
    } catch (e) {} finally { setIsUploading(false); }
  }

  // ARCHIVIO RAPIDO DELLE TATTICHE: FUNZIONE CORE CORRETTA CON EXTRAZIONE TITOLO INTELLIGENTE
  async function handleAnalyzeExternalTactic() {
    if (!externalTacticInput.trim()) return;
    setIsTyping(true);
    if (isMobile) setMobileViewTab('chat');
    const inputBuffer = externalTacticInput;
    setExternalTacticInput('');
    try {
      const prompt = `Analizza questa tattica ed estrai un titolo per riconoscerla: """${inputBuffer}""" sulla rosa ${clubName}. Fornisci istruzioni di squadra esaustive a caratteri giganti. Metti all'inizio la dicitura TITOLO: [Nome breve per archiviare questa tattica, max 4 parole]`;
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(prompt);
      const outputText = result.response.text();

      // Estraiamo il titolo pulito per creare il pulsante di salto rapido
      const titoloMatch = outputText.match(/TITOLO:\s*(.*)/i);
      const cleanTitle = titoloMatch ? titoloMatch[1].replace('[', '').replace(']', '').trim() : `Tattica del ${new Date().toLocaleDateString()}`;

      const userMsg = { sender_role: `user:vice`, content: `📋 Mister ha inoltrato una nuova tattica per la convalida rapida.` };
      const aiMsg = { sender_role: 'vice', content: outputText };
      setMessages(prev => [...prev, userMsg, aiMsg]);

      // Salviamo nell'archivio rapido per l'accesso istantaneo
      const newReport = { title: cleanTitle, content: outputText, id: Date.now() };
      setTacticReports(prev => [newReport, ...prev]);

      try { await supabase.from('club_messages').insert([userMsg, aiMsg]); } catch(e) {}
    } catch (error) { console.error(error); } finally { setIsTyping(false); }
  }

  // CORE DI AUDIT FINANZIARIO FINAMENTE CORRETTO DA OGNI ERRORE DI HOISTING
  async function handleFinanceAudit() {
    setIsTyping(true);
    if (isMobile) setMobileViewTab('chat');
    try {
      const soraPlayersContext = players.map(p => ({ nome: p.name, stipendio: p.attributes?.Ingaggio || '-' }));
      const prompt = `CFO Club ${clubName}. Redigi un audit finanziario Moneyball cinico basato su: Cassa €${finances.balance}. Contratti: ${JSON.stringify(soraPlayersContext.slice(0, 30))}`;
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(prompt);
      const auditOutput = result.response.text();

      const userMsg = { sender_role: `user:cfo`, content: `📊 Mister ha richiesto lo sblocco di un Audit Contabile Globale in tempo reale.` };
      const aiMsg = { sender_role: 'cfo', content: auditOutput };
      setMessages(prev => [...prev, userMsg, aiMsg]);
      try { await supabase.from('club_messages').insert([userMsg, aiMsg]); } catch(e) {}
    } catch (e) { console.error(e); } finally { setIsTyping(false); }
  }

  function handleSidebarClick(room) {
    setActiveRoom(room);
    setMobileViewTab('chat'); 
  }

  function renderChatWindow() {
    const visibleMessages = messages.filter(msg => {
      if (msg.sender_role === 'system') return true;
      if (activeRoom === 'board') return msg.sender_role === 'board' || msg.sender_role === 'user:board' || msg.sender_role === 'user';
      return msg.sender_role === activeRoom || msg.sender_role === `user:${activeRoom}`;
    });

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#0d0a16', width: '100%', height: '100%' }}>
        <div style={{ height: '75px', padding: '0 24px', borderBottom: '2px solid #231b3a', display: 'flex', alignItems: 'center', backgroundColor: '#140f24', justifyContent: 'space-between', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <MessageSquare size={24} color="#da1b60" /> 
            <h2 style={{ fontSize: isMobile ? '16px' : '22px', color: '#ffffff', margin: 0, textTransform: 'uppercase', fontWeight: '900', letterSpacing: '0.5px' }}>
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
                  if (msg.sender_role.startsWith('user')) { align = 'flex-end'; bColor = '#da1b60'; nameLabel = 'MISTER (OMISEREZ)'; itemBg = '#1d1433'; }
                  else if (msg.sender_role === 'vice') { bColor = '#22d3ee'; nameLabel = 'VICE ALLENATORE'; }
                  else if (msg.sender_role === 'ds') { bColor = '#fbbf24'; nameLabel = 'DIRETTORE SPORTIVO'; }
                  else if (msg.sender_role === 'scout') { bColor = '#f43f5e'; nameLabel = 'CAPO OSSERVATORE'; }
                  else if (msg.sender_role === 'cfo') { bColor = '#10b981'; nameLabel = 'CFO FINANZE'; }
                  else if (msg.sender_role === 'press') { bColor = '#ec4899'; nameLabel = 'UFFICIO STAMPA'; }
                  else if (msg.sender_role === 'youth') { bColor = '#ffaa00'; nameLabel = 'RESPONSABILE GIOVANILI'; }
                  else if (msg.sender_role === 'analyst') { bColor = '#3b82f6'; nameLabel = 'MATCH ANALYST'; }
                  return (
                    <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: align, width: '100%' }}>
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '900', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>{nameLabel}</span>
                      <div style={{ padding: '16px', fontSize: '16px', backgroundColor: itemBg, color: '#ffffff', borderLeft: `4px solid ${bColor}`, borderRadius: '6px', maxWidth: '85%', lineHeight: '1.6', whiteSpace: 'pre-line', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>{msg.content}</div>
                    </div>
                  );
                })}
                {isTyping && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '11px', color: '#475569', fontWeight: 'bold', marginBottom: '4px' }}>CENTRALINA DI ELABORAZIONE</span>
                    <div style={{ padding: '14px', fontSize: '15px', backgroundColor: '#140f24', color: '#64748b', borderLeft: '4px solid #475569', borderRadius: '6px', fontStyle: 'italic' }}>Lo specialista sta scrivendo la risposta tecnica nel registro societario...</div>
                  </div>
                )}
              </div>

              <div style={{ padding: '20px', backgroundColor: '#140f24', borderTop: '2px solid #231b3a', boxShadow: '0 -4px 15px rgba(0,0,0,0.3)' }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <ChevronRight style={{ position: 'absolute', left: '14px', color: '#da1b60' }} size={20} />
                  <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder={activeRoom === 'board' ? "Ordina una discussione generale al Tavolone..." : `Invia un quesito diretto in modalità singola a: ${activeRoom.toUpperCase()}...`} style={{ width: '100%', backgroundColor: '#090710', border: '2px solid #231b3a', padding: '16px 50px 16px 42px', fontSize: '16px', color: '#ffffff', borderRadius: '8px', outline: 'none', fontWeight: '500' }} />
                  <button onClick={handleSendMessage} disabled={isTyping} style={{ position: 'absolute', right: '16px', background: 'none', border: 'none', color: '#da1b60', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Send size={18} /></button>
                </div>
              </div>
            </div>
          )}

          {(!isMobile || mobileViewTab === 'tools') && (
            <div style={{ width: isMobile ? '100%' : '460px', backgroundColor: '#0f0c1b', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', borderLeft: isMobile ? 'none' : '2px solid #231b3a', boxSizing: 'border-box', overflowY: 'auto' }}>
              {activeRoom === 'board' && (
                <>
                  <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#a855f7', borderBottom: '2px solid #231b3a', paddingBottom: '8px', margin: 0, fontWeight: '900' }}>Dati Identità Club</h3>
                  <div style={{ backgroundColor: '#140f24', border: '1px solid #231b3a', padding: '14px', borderRadius: '6px' }}>
                    <label style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>Club Attuale in FM</label>
                    <input type="text" value={clubName} onChange={(e) => setClubName(e.target.value)} style={{ width: '92%', backgroundColor: '#090710', border: '2px solid #231b3a', padding: '10px', color: '#ffffff', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '14px', borderRadius: '4px' }} />
                  </div>
                  <div style={{ backgroundColor: '#140f24', border: '1px solid #231b3a', padding: '16px', borderRadius: '6px', fontSize: '14px', lineHeight: '1.6' }}>
                    <span style={{ color: '#22d3ee', display: 'block', marginBottom: '8px', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '12px' }}>📊 Stato Patrimoniale Attivo:</span>
                    • Calciatori in Memoria: <strong style={{ color: '#fff', fontSize: '16px' }}>{players.length}</strong><br />
                    • Cassa Club: <strong style={{ color: '#10b981', fontSize: '16px' }}>€{finances.balance.toLocaleString()}</strong><br />
                    • Budget Trasferimenti: <strong style={{ color: '#fff', fontSize: '16px' }}>€{finances.transfer_budget.toLocaleString()}</strong>
                  </div>
                </>
              )}

              {activeRoom === 'vice' && (
                <>
                  <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#22d3ee', borderBottom: '2px solid #231b3a', paddingBottom: '8px', margin: 0, fontWeight: '900' }}>Laboratorio Tattico</h3>
                  <textarea value={externalTacticInput} onChange={(e) => setExternalTacticInput(e.target.value)} placeholder="Incolla qui l'analisi testo o il link di una tattica esterna (es. da Magicomonta o FMScout)..." style={{ width: '94%', height: '140px', backgroundColor: '#090710', border: '2px solid #231b3a', padding: '12px', color: '#ffffff', fontSize: '15px', resize: 'none', borderRadius: '6px' }} />
                  <button onClick={handleAnalyzeExternalTactic} disabled={isTyping} style={{ backgroundColor: '#22d3ee', color: '#0f0b1b', border: 'none', padding: '14px', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', borderRadius: '6px', cursor: 'pointer', width: '100%', boxShadow: '0 4px 12px rgba(34,211,238,0.2)' }}>Avvia Convalida Modulo</button>
                  
                  {/* INTERFACCIA ARCHIVIO RAPIDO TATTICHE CON LINK DIRETTI SENZA SCORRERE */}
                  <div style={{ marginTop: '15px', backgroundColor: '#140f24', padding: '14px', borderRadius: '8px', border: '1px solid #231b3a' }}>
                    <span style={{ fontSize: '11px', color: '#22d3ee', fontWeight: 'bold', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>📂 Referti Rapidi Moduli Esaminati:</span>
                    {tacticReports.length === 0 ? <div style={{ fontSize: '12px', color: '#475569', fontStyle: 'italic' }}>Nessun report in archivio rapido.</div> : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {tacticReports.map((rep) => (
                          <button key={rep.id} onClick={() => setSelectedTacticReport(rep)} style={{ width: '100%', textAlign: 'left', backgroundColor: '#090710', border: '1px solid #231b3a', padding: '10px', borderRadius: '6px', color: '#fff', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s' }}>⚡ {rep.title}</button>
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
                  <button onClick={() => scoutInputRef.current.click()} disabled={isTyping} style={{ width: '100%', backgroundColor: '#f43f5e', color: '#ffffff', border: 'none', padding: '14px', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', borderRadius: '6px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(244,63,94,0.3)' }}>Carica Foto Profilo Calciatore</button>
                </>
              )}

              {activeRoom === 'ds' && (
                <>
                  <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#fbbf24', borderBottom: '2px solid #231b3a', paddingBottom: '8px', margin: 0, fontWeight: '900' }}>Alert Contratti</h3>
                  <div style={{ backgroundColor: '#140f24', border: '2px solid #231b3a', padding: '16px', borderRadius: '6px', fontSize: '15px', lineHeight: '1.6', color: '#ffffff' }}>
                    I giocatori contrassegnati come <strong style={{ color: '#ef4444' }}>TOSSICO</strong> nella tabella organico pesano sul bilancio e offrono rendimenti scarsi. Taglia o vendi subito per fare spazio in cassa.
                  </div>
                </>
              )}

              {activeRoom === 'cfo' && (
                <>
                  <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#10b981', borderBottom: '2px solid #231b3a', paddingBottom: '8px', margin: 0, fontWeight: '900' }}>Cassaforte & Sviluppo Bilanci</h3>
                  <div style={{ backgroundColor: '#140f24', border: '2px solid #231b3a', padding: '14px', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 'bold', textTransform: 'uppercase' }}>📊 Scansione Bilancio OCR:</span>
                    <input type="file" accept="image/*" ref={financeInputRef} onChange={handleFinanceImageUpload} style={{ display: 'none' }} />
                    <button onClick={() => financeInputRef.current.click()} disabled={isTyping} style={{ width: '100%', backgroundColor: '#10b981', color: '#0f0c1b', border: 'none', padding: '12px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer', borderRadius: '4px' }}>Carica Screen Finanze</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                    {/* FIX ERRORE 400 CONVERTITI RIGIDAMENTE IN PROPERTY VALIDI DI RE-BUILD */}
                    <div><label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold' }}>Bilancio (€)</label><input type="number" value={finances.balance} onChange={(e) => updateFinancesCloud('balance', e.target.value)} style={{ width: '92%', backgroundColor: '#090710', border: '2px solid #231b3a', padding: '8px', color: '#10b981', fontWeight: 'bold', borderRadius: '4px' }} /></div>
                    <div><label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold' }}>Budget Mercato (€)</label><input type="number" value={finances.transfer_budget} onChange={(e) => updateFinancesCloud('transfer_budget', e.target.value)} style={{ width: '92%', backgroundColor: '#090710', border: '2px solid #231b3a', padding: '8px', color: '#fff', borderRadius: '4px' }} /></div>
                  </div>
                  <div style={{ backgroundColor: '#140f24', border: '1px solid #231b3a', padding: '14px', borderRadius: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#fff', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>📊 Simulatore Moneyball</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input type="number" value={simCost} onChange={(e) => setSimCost(e.target.value)} placeholder="Costo" style={{ width: '45%', backgroundColor: '#090710', border: '1px solid #231b3a', padding: '6px', color: '#fff', fontSize: '12px', borderRadius: '4px' }} />
                      <input type="number" value={simWage} onChange={(e) => setSimWage(e.target.value)} placeholder="Stip." style={{ width: '45%', backgroundColor: '#090710', border: '1px solid #231b3a', padding: '6px', color: '#fff', fontSize: '12px', borderRadius: '4px' }} />
                    </div>
                    <button onClick={handleSimulateTransfer} style={{ backgroundColor: '#10b981', color: '#0f0c1b', border: 'none', padding: '8px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer', borderRadius: '4px', marginTop: '10px', width: '100%' }}>Calcola Ammortamento</button>
                    {simResult && <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#090710', borderLeft: `3px solid ${simResult.color}`, fontSize: '12px', color: '#fff' }}>{simResult.status}</div>}
                  </div>
                  <button onClick={handleFinanceAudit} disabled={isTyping} style={{ backgroundColor: '#da1b60', color: '#fff', border: 'none', padding: '12px', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer', borderRadius: '6px', width: '100%' }}>Genera Audit Contabile</button>
                </>
              )}

              {activeRoom === 'press' && (
                <>
                  <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#ec4899', borderBottom: '2px solid #231b3a', paddingBottom: '8px', margin: 0, fontWeight: '900' }}>Media Strategic Hub</h3>
                  <div style={{ backgroundColor: '#140f24', border: '1px solid #231b3a', padding: '14px', borderRadius: '6px', marginBottom: '4px' }}>
                    <label style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>🎭 Personalità Personaggio:</label>
                    <select value={personality} onChange={(e) => updateCoachPersonality(e.target.value)} style={{ width: '100%', backgroundColor: '#090710', border: '2px solid #231b3a', padding: '8px', color: '#fff', fontSize: '13px', cursor: 'pointer', borderRadius: '4px' }}>
                      <option value="professional">💼 Professional (Diplomatico)</option>
                      <option value="aggressive">🔥 Aggressive (Mourinhiano)</option>
                      <option value="passionate">❤️ Passionate (Passionale / Viscerale)</option>
                    </select>
                  </div>
                  <input type="file" accept="image/*" ref={pressInputRef} onChange={handlePressImageUpload} style={{ display: 'none' }} />
                  <button onClick={() => pressInputRef.current.click()} disabled={isTyping} style={{ width: '100%', backgroundColor: '#ec4899', color: '#fff', border: 'none', padding: '12px', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', borderRadius: '6px', cursor: 'pointer' }}>Carica Screenshot Conferenza</button>
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
                  <button onClick={() => analystInputRef.current.click()} disabled={isTyping} style={{ width: '100%', backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '12px', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', borderRadius: '6px', cursor: 'pointer' }}>Carica Schermata Dati Partita</button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderMasterDatabase() {
    const firstTeamPlayers = players.filter(p => p.type === 'player' && (p.age >= 20 || !p.age));
    const youthPlayers = players.filter(p => p.type === 'player' && p.age && p.age < 20);
    let visibleList = [];
    if (dbSubTab === 'first_team') visibleList = firstTeamPlayers;
    else if (dbSubTab === 'youth') visibleList = youthPlayers;

    const getSortValue = (player, field) => {
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
            <button onClick={() => setDbSubTab('first_team')} style={{ padding: '8px 16px', border: 'none', fontSize: '13px', fontWeight: 'bold', backgroundColor: dbSubTab === 'first_team' ? '#da1b60' : 'transparent', color: '#fff', borderRadius: '4px', flexShrink: 0 }}>Prima Squadra ({firstTeamPlayers.length})</button>
            <button onClick={() => setDbSubTab('youth')} style={{ padding: '8px 16px', border: 'none', fontSize: '13px', fontWeight: 'bold', backgroundColor: dbSubTab === 'youth' ? '#ffaa00' : 'transparent', color: '#fff', borderRadius: '4px', flexShrink: 0 }}>Under 20 ({youthPlayers.length})</button>
            <button onClick={() => setDbSubTab('shortlist')} style={{ padding: '8px 16px', border: 'none', fontSize: '13px', fontWeight: 'bold', backgroundColor: dbSubTab === 'shortlist' ? '#f43f5e' : 'transparent', color: '#fff', borderRadius: '4px', flexShrink: 0 }}>🎯 Shortlist ({shortlist.length})</button>
            <button onClick={() => setDbSubTab('matches')} style={{ padding: '8px 16px', border: 'none', fontSize: '13px', fontWeight: 'bold', backgroundColor: dbSubTab === 'matches' ? '#3b82f6' : 'transparent', color: '#fff', borderRadius: '4px', flexShrink: 0 }}>🏆 Storico Gare ({matches.length})</button>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUploadOCR} style={{ display: 'none' }} />
            <button onClick={() => fileInputRef.current.click()} disabled={isUploading} style={{ backgroundColor: '#da1b60', color: '#fff', border: 'none', padding: '10px 20px', fontSize: '12px', fontWeight: 'bold', borderRadius: '6px' }}>Carica Foto Rosa</button>
            {players.length > 0 && <button onClick={handleClearAllData} style={{ backgroundColor: 'transparent', border: '2px solid #ef4444', color: '#ef4444', padding: '10px 16px', fontSize: '12px', fontWeight: 'bold', borderRadius: '6px' }}>Azzera Sede</button>}
          </div>
        </div>

        <div style={{ flex: 1, padding: isMobile ? '12px' : '24px', overflowY: 'auto', backgroundColor: '#090710', width: '100%', boxSizing: 'border-box' }}>
          {dbSubTab === 'shortlist' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {shortlist.length === 0 ? <div style={{ color: '#475569', textAlign: 'center', padding: '40px' }}>Lista desideri vuota. Carica un profilo dall'Ufficio Scout.</div> : shortlist.map((s, i) => (
                <div key={i} style={{ backgroundColor: '#140f24', border: '2px solid #f43f5e', padding: '16px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '18px', fontWeight: '900', color: '#fff' }}>{s.name}</span>
                    <span style={{ backgroundColor: '#f43f5e', color: '#fff', fontSize: '11px', padding: '4px 8px', borderRadius: '4px', fontWeight: '900' }}>{s.verdict}</span>
                  </div>
                  <div style={{ color: '#22d3ee', fontSize: '14px', fontWeight: 'bold' }}>Ruolo: {s.position}</div>
                  <div style={{ color: '#cbd5e1', fontSize: '14px', whiteSpace: 'pre-line', marginTop: '6px' }}>{s.analysis}</div>
                </div>
              ))}
            </div>
          )}

          {dbSubTab === 'matches' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {matches.length === 0 ? <div style={{ color: '#475569', textAlign: 'center', padding: '40px' }}>Nessuna partita a referto. Carica un tabellino dall'Ufficio Analyst.</div> : matches.map((m, i) => (
                <div key={i} style={{ backgroundColor: '#140f24', border: '2px solid #3b82f6', padding: '16px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '18px', fontWeight: '900', color: '#fff' }}>SORA vs {m.opponent.toUpperCase()}</span>
                    <span style={{ backgroundColor: '#3b82f6', color: '#fff', fontSize: '14px', padding: '4px 10px', borderRadius: '4px', fontWeight: '900' }}>{m.result}</span>
                  </div>
                  <div style={{ color: '#34d399', fontSize: '13px', fontWeight: 'bold' }}>Metriche: xG {m.xg_team} - {m.xg_opp} xG Subiti</div>
                  <div style={{ color: '#cbd5e1', fontSize: '14px', whiteSpace: 'pre-line', marginTop: '6px' }}>{m.analysis}</div>
                </div>
              ))}
            </div>
          )}

          {(dbSubTab === 'first_team' || dbSubTab === 'youth') && (
            <div style={{ backgroundColor: '#140f24', border: '2px solid #231b3a', borderRadius: '8px', overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
              {visibleList.length === 0 ? <div style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>Nessun calciatore in archivio.</div> : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#1d1733', borderBottom: '3px solid #090710' }}>
                      <th onClick={() => handleSort('name')} style={{ padding: '12px 10px', color: '#ffffff', cursor: 'pointer', fontWeight: '900' }}>Nome</th>
                      <th onClick={() => handleSort('position')} style={{ padding: '12px 10px', color: '#ffffff', cursor: 'pointer', fontWeight: '900' }}>Ruolo</th>
                      <th onClick={() => handleSort('age')} style={{ padding: '12px 10px', color: '#ffffff', cursor: 'pointer', textAlign: 'center', fontWeight: '900' }}>Età</th>
                      <th onClick={() => handleSort('pres')} style={{ padding: '12px 10px', color: '#ffffff', cursor: 'pointer', textAlign: 'center', fontWeight: '900' }}>Pres</th>
                      <th onClick={() => handleSort('gol')} style={{ padding: '12px 10px', color: '#ffffff', cursor: 'pointer', textAlign: 'center', fontWeight: '900' }}>Gol</th>
                      <th onClick={() => handleSort('mv')} style={{ padding: '12px 10px', color: '#ffffff', cursor: 'pointer', textAlign: 'center', fontWeight: '900' }}>M.V.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedList.map((p, idx) => (
                      <tr key={idx} onClick={() => handleSelectPlayer(p)} style={{ borderBottom: '1px solid #231b3a', cursor: 'pointer', backgroundColor: selectedProfile?.id === p.id ? '#271e44' : 'transparent' }}>
                        <td style={{ padding: '14px 10px', fontWeight: 'bold', color: '#ffffff', fontSize: '15px' }}>{p.name} {p.notes && <span style={{ fontSize: '10px', backgroundColor: '#a855f7', padding: '2px 4px', borderRadius: '3px', marginLeft: '4px' }}>FASCICOLO</span>}</td>
                        <td style={{ padding: '14px 10px', color: '#22d3ee', fontWeight: '700' }}>{p.position || 'N/D'}</td>
                        <td style={{ padding: '14px 10px', textAlign: 'center', color: '#fff' }}>{p.age || '-'}</td>
                        <td style={{ padding: '14px 10px', textAlign: 'center', color: '#cbd5e1' }}>{p.attributes?.Presenze || '-'}</td>
                        <td style={{ padding: '14px 10px', textAlign: 'center', color: '#ffffff', fontWeight: 'bold' }}>{p.attributes?.Gol || '-'}</td>
                        <td style={{ padding: '14px 10px', textAlign: 'center', color: '#34d399', fontWeight: 'bold' }}>{p.attributes?.['Media Voto'] || '-'}</td>
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

      {/* MODAL / MODULO DI APERTURA FULL SCREEN PER IL REFERTO RAPIDO SENZA FARE SCROLL */}
      {selectedTacticReport && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(5, 3, 10, 0.95)', zIndex: 99999, display: 'flex', padding: isMobile ? '10px' : '40px', boxSizing: 'border-box' }}>
          <div style={{ margin: 'auto', width: '100%', maxWidth: '800px', backgroundColor: '#140f24', border: '3px solid #22d3ee', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', maxHeight: '90vh', boxShadow: '0 25px 50px rgba(0,0,0,0.9)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #231b3a', paddingBottom: '14px', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '22px', fontWeight: '900', color: '#22d3ee' }}>📋 REFERTO: {selectedTacticReport.title.toUpperCase()}</h3>
              <button onClick={() => setSelectedTacticReport(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}><X size={26} /></button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', fontSize: '17px', color: '#ffffff', lineHeight: '1.7', whiteSpace: 'pre-line', paddingRight: '6px' }}>{selectedTacticReport.content}</div>
            <button onClick={() => setSelectedTacticReport(null)} style={{ marginTop: '16px', backgroundColor: '#22d3ee', color: '#000', border: 'none', padding: '14px', fontSize: '14px', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer', textTransform: 'uppercase' }}>Chiudi Documento</button>
          </div>
        </div>
      )}

      {/* FLYOUT DETTAGLIO ATTRIBUTI + REGISTRO NOTE EDITABILI */}
      {selectedProfile && (
        <div style={{ position: 'fixed', right: isMobile ? '10px' : '25px', bottom: isMobile ? '80px' : '25px', left: isMobile ? '10px' : 'auto', width: isMobile ? 'calc(100% - 20px)' : '350px', backgroundColor: '#140f24', border: '3px solid #da1b60', padding: '16px', borderRadius: '12px', boxShadow: '0 30px 60px rgba(0,0,0,0.9)', zIndex: 5000, boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #231b3a', paddingBottom: '10px', marginBottom: '12px', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '10px', color: '#da1b60', fontWeight: '900' }}>FASCICOLO CALCIATORE</span>
              <h4 style={{ fontSize: '18px', color: '#ffffff', margin: '2px 0 0 0', fontWeight: '900' }}>{selectedProfile.name}</h4>
            </div>
            <button onClick={() => setSelectedProfile(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', padding: '8px 12px', backgroundColor: '#090710', borderRadius: '6px' }}><span style={{ color: '#94a3b8' }}>Ruolo</span><span style={{ color: '#22d3ee', fontWeight: '900' }}>{selectedProfile.position || 'N/D'}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', padding: '8px 12px', backgroundColor: '#090710', borderRadius: '6px' }}><span style={{ color: '#94a3b8' }}>Età</span><span style={{ color: '#ffffff', fontWeight: '900' }}>{selectedProfile.age || 'N/D'}</span></div>
            {selectedProfile.attributes && Object.entries(selectedProfile.attributes).map(([key, val]) => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', padding: '8px 12px', backgroundColor: '#090710', borderRadius: '6px' }}><span style={{ color: '#94a3b8' }}>{key}</span><span style={{ color: '#34d399', fontWeight: '900' }}>{String(val)}</span></div>
            ))}
            <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', color: '#a855f7', fontWeight: 'bold', textTransform: 'uppercase' }}>✍️ Note e Direttive del Mister:</label>
              <textarea value={editingNotes} onChange={(e) => setEditingNotes(e.target.value)} placeholder="Inserisci focus allenamento, infortuni o note di campo..." style={{ width: '92%', height: '80px', backgroundColor: '#090710', border: '1px solid #231b3a', padding: '8px', color: '#fff', fontSize: '14px', borderRadius: '6px', resize: 'none' }} />
              <button onClick={handleSavePlayerNotes} disabled={isSavingNotes} style={{ backgroundColor: '#a855f7', color: '#fff', border: 'none', padding: '10px', fontSize: '12px', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer', textTransform: 'uppercase' }}>
                {isSavingNotes ? "Sincronizzazione..." : "Salva Note"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default App
