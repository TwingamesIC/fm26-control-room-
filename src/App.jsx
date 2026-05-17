import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient'
import { MessageSquare, Database, Settings, Send, Users, Sliders, TrendingUp, ImageIcon, X, CloudOff, Briefcase, ChevronRight, HelpCircle, Award, Activity, Search } from 'lucide-react'
import { GoogleGenerativeAI } from '@google/generative-ai'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

function App() {
  // CONFIGURAZIONE STANZE DIRIGENZIALI E SOTTO-TAB MASTER DATABASE
  const [activeRoom, setActiveRoom] = useState('board') 
  const [dbSubTab, setDbSubTab] = useState('first_team') 
  
  // ORDINAMENTO LOGICO UNIVERSALE TABELLE
  const [sortField, setSortField] = useState('name')
  const [sortDirection, setSortDirection] = useState('asc')

  // DETECTOR DINAMICO SCHERMO SMARTPHONE PER INTERFACCIA RESPONSIVE
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  const [mobileViewTab, setMobileViewTab] = useState('chat')

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // BLINDATURA INIZIALIZZAZIONE LOCALSTORAGE CONTRO I CRASH DI LETTURA
  const [clubName, setClubName] = useState(() => localStorage.getItem('hq_club_name') || 'Sora')
  const [players, setPlayers] = useState(() => {
    try { return JSON.parse(localStorage.getItem('hq_players')) || []; } catch(e) { return []; }
  })
  const [shortlist, setShortlist] = useState(() => {
    try { return JSON.parse(localStorage.getItem('hq_shortlist')) || []; } catch(e) { return []; }
  })
  const [matches, setMatches] = useState(() => {
    try { return JSON.parse(localStorage.getItem('hq_matches')) || []; } catch(e) { return []; }
  })
  const [messages, setMessages] = useState(() => {
    try { return JSON.parse(localStorage.getItem('hq_messages')) || [{ sender_role: 'system', content: 'Centrale operativa allineata. Lo staff ha preso un caffè forte ed è pronto a chiacchierare senza filtri.' }]; } catch(e) { return [{ sender_role: 'system', content: 'Centrale operativa allineata.' }]; }
  })
  const [tacticReports, setTacticReports] = useState(() => {
    try { return JSON.parse(localStorage.getItem('hq_tactic_reports')) || []; } catch(e) { return []; }
  })
  const [selectedTacticReport, setSelectedTacticReport] = useState(null)
  
  const [finances, setFinances] = useState(() => {
    try { return JSON.parse(localStorage.getItem('hq_finances')) || { balance: 2500000, transfer_budget: 800000, wage_budget: 15000 }; } catch(e) { return { balance: 2500000, transfer_budget: 800000, wage_budget: 15000 }; }
  })

  // PARAMETRI DEL PROFILO CARATTERIALE AVANZATO DEL MISTER
  const [personality, setPersonality] = useState(() => localStorage.getItem('hq_coach_personality') || 'professional')
  const [pressStyle, setPressStyle] = useState(() => localStorage.getItem('hq_press_style') || 'diplomatic')
  const [squadShield, setSquadShield] = useState(() => localStorage.getItem('hq_squad_shield') || 'shield_total')
  const [rivalRelation, setRivalRelation] = useState(() => localStorage.getItem('hq_rival_relation') || 'respectful')
  const [tacticalFocus, setTacticalFocus] = useState(() => localStorage.getItem('hq_tactical_focus') || 'pragmatic')

  // PARAMETRI LIVE DEL SIMULATORE DI AMMORTAMENTO SOCIETARIO
  const [simCost, setSimCost] = useState('500000')
  const [simWage, setSimWage] = useState('2000')
  const [simYears, setSimYears] = useState('3')
  const [simResult, setSimResult] = useState(null)

  // BUFFER INTERFACCIA INPUT SCRITTURA TATTICA
  const [externalTacticInput, setExternalTacticInput] = useState('')

  // STATI DI BUFFER PER I FLYOUT DEI FASCICOLI INDIVIDUALI
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

  // MONITORAGGIO LOCALE FAIL-SAFE SUL BROWSER SUI CAMBIAMENTI DI STATO
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
  
  useEffect(() => {
    localStorage.setItem('hq_club_name', clubName)
    fetchCloudData()
  }, [clubName])

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isTyping])

  // SINCRONIZZAZIONE DI RETE GLOBALE DEL DATABASE SOCIETARIO SUL CLOUD
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

  // AGGIORNAMENTO DELLE NOTE DEL CALCIATORE IN RETE CLOUD
  async function handleSavePlayerNotes() {
    if (!selectedProfile) return;
    setIsSavingNotes(true);
    try {
      const updatedPlayers = players.map(p => p.id === selectedProfile.id ? { ...p, notes: editingNotes } : p);
      setPlayers(updatedPlayers);
      setSelectedProfile(prev => ({ ...prev, notes: editingNotes }));
      await supabase.from('players').update({ notes: editingNotes }).eq('id', selectedProfile.id);
      
      const systemNote = { sender_role: 'system', content: `📝 Il Mister ha aggiornato il fascicolo di ${selectedProfile.name}: "${editingNotes}"` };
      setMessages(prev => [...prev, systemNote]);
    } catch (e) { console.error(e); } finally { setIsSavingNotes(false); }
  }

  function handleSelectPlayer(player) {
    if (!player) return;
    setSelectedProfile(player);
    setEditingNotes(player.notes || '');
  }

  function handleSidebarClick(room) {
    setActiveRoom(room);
    setMobileViewTab('chat'); 
  }

  function handleSimulateTransfer() {
    const cost = parseFloat(simCost) || 0; const weeklyWage = parseFloat(simWage) || 0; const years = parseInt(simYears) || 1;
    const annualAmortization = cost / years; const annualWageCost = weeklyWage * 52; const totalAnnualImpact = annualAmortization + annualWageCost;
    let status = 'APPROVATO'; let color = '#34d399'; let notes = `Operazione sostenibile per il Sora. Impatto annuo complessivo: €${totalAnnualImpact.toLocaleString()}.`;
    if (cost > finances.transfer_budget) { status = 'BLOCCATO'; color = '#ef4444'; notes = `Fondi insufficienti nel budget trasferimenti del club.`; }
    else if (weeklyWage > (finances.wage_budget * 0.3)) { status = 'RISCHIO CRISI SPOGLIATOIO'; color = '#ffaa00'; notes = `L'ingaggio supera il 30% del tetto salariale rimasto.`; }
    setSimResult({ status, color, annualAmortization, annualWageCost, notes });
  }

  // CORE ENGINE CHAT CON COMPLIANCE TOTALE AI FILTRI CONTRO I CRASH VALORI NULLI
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
      const squadContext = players.map(p => ({ nome: p?.name || 'Sconosciuto', ruolo: p?.position || 'N/D', stats: p?.attributes || {}, note_mister: p?.notes || '' }));
      const shortlistContext = shortlist.slice(0, 15).map(s => ({ nome: s?.name || 'Target', ruolo: s?.position || 'N/D', verdetto: s?.verdict || 'VAGLIATO' }));
      const matchesContext = matches.slice(0, 5).map(m => ({ avversario: m?.opponent || 'Gara', risultato: m?.result || 'N/D', analisi: m?.analysis || '' }));

      const businessChronology = updatedMessages.slice(-45).map(m => {
        let roleLabel = m.sender_role ? String(m.sender_role).toUpperCase() : 'MISTER';
        if (roleLabel.startsWith('USER:')) roleLabel = `MISTER (nella stanza ${roleLabel.split(':')[1]})`;
        return `${roleLabel}: ${m.content}`;
      }).join('\n');

      let instructionPrompt = `
        SEI LO STAFF REALISTICO, PASSIONALE E CHIACCHIERONE DEL CLUB "${clubName.toUpperCase()}" SU FOOTBALL MANAGER 2026.
        Il tuo Mister (Omiserez) ti dice: "${currentInputText}"
        
        ⚠️ PARAMETRI IDENTITÀ CARATTERIALE DEL MISTER (REAGISCI DI CONSEGUENZA):
        - Stile nei Media con la Stampa: ${pressStyle.toUpperCase()}
        - Livello Protezione Spogliatoio: ${squadShield.toUpperCase()}
        - Rapporti psicologici con i Rivali: ${rivalRelation.toUpperCase()}
        - Filosofia di Campo: ${tacticalFocus.toUpperCase()}

        REGOLE INTERNE CARATTERE DELLO STAFF (VIETATO COMPORTARSI DA BOT):
        - VICE ALLENATORE: Dice "Mister", è un uomo di campo verace, odia i nerd dei dati, usa metafore spavalde, difende lo spogliatoio.
        - DIRETTORE SPORTIVO: Squalo del calciomercato, parla sempre di plusvalenze, agenti avidi, scadenze contrattuali e furbate.
        - CHIEF SCOUT: Stravede per i ragazzi prodigio tecnici (wonderkids), si gasa per i dribbling e disprezza i vecchi bidoni.
        - CFO FINANZE: Ironico, sardonico, tirchio fino al midollo, ti rimprovera se spendi troppo e si lamenta dei budget.
        - ADDETTO STAMPA: Pettegolo, sa le trappole dei giornalisti locali e adora la tensione dei titoli sui giornali.
        - RESPONSABILE GIOVANILI: Tratta i ragazzi Under 20 del Sora come figli suoi, vuole vederli tutti in prima squadra subito.
        - MATCH ANALYST: Parla solo di xG, tiri e statistiche matematiche fredde, ma viene preso in giro dal Vice di continuo.

        CRONOLOGIA DISCUSSIONI PRECEDENTI:
        ${businessChronology}
        
        SITUAZIONE PATRIMONIALE ED ORGANICO REALE:
        - Cassa €${finances.balance} | Budget Mercato €${finances.transfer_budget}
        - ROSA REALE SORA: ${JSON.stringify(squadContext.slice(0, 30))}
        - LISTA DESIDERI OBIETTIVI (SHORTLIST): ${JSON.stringify(shortlistContext)}
        - ARCHIVIO GARE E PARTITE GIOCATE: ${JSON.stringify(matchesContext)}
      `;

      if (activeRoom === 'board') {
        instructionPrompt += `\nREGOLE TAVOLO PLENARIA: Rispondi simulando un dibattito acceso e divertente al tavolone in cui TUTTI E 7 i collaboratori intervengono uno dopo l'altro con scambi di battute spontanei ed ironici tra di loro.`;
      } else {
        instructionPrompt += `\nSTANZA SINGOLA ATTIVA: SEI NELL'UFFICIO PRIVATO DI '${activeRoom.toUpperCase()}'. Rispondi al Mister interpretando esclusivamente il tuo personaggio a quattrocchi senza mezzi termini.`;
      }

      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(instructionPrompt);
      const aiMessageObj = { sender_role: activeRoom, content: result.response.text() };
      setMessages(prev => [...prev, aiMessageObj]);
      try { await supabase.from('club_messages').insert([aiMessageObj]); } catch(e) {}
    } catch (error) { console.error(error); } finally { setIsTyping(false); }
  }

  // ANALISI GRAFICHE MULTIMEDIALI BLINDATE CONTRO I NULL POINTERS
  async function handleScoutImageUpload(event) {
    const file = event.target.files[0]; if (!file) return; setIsTyping(true); if (isMobile) setMobileViewTab('chat');
    try {
      const reader = new FileReader(); reader.onloadend = async () => {
        const imagePart = { inlineData: { data: reader.result.split(',')[1], mimeType: file.type } };
        const prompt = `Sei il Capo Osservatore del club "${clubName}". Schedatura FM26. Restituisci l'output strutturato così: VERDETTO: [Mettere solo ACQUISTARE, RISERVA o EVITARE] NOME: [Nome] RUOLO: [Ruolo] REPORT: [Analisi ruspante e dettagliata per il Mister]`;
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent([prompt, imagePart]); const output = result.response.text();
        const pName = (output.match(/NOME:\s*(.*)/i)?.[1] || 'Obiettivo Scansionato').trim();
        const pRole = (output.match(/RUOLO:\s*(.*)/i)?.[1] || 'N/D').trim();
        const pVerdict = (output.match(/VERDETTO:\s*(.*)/i)?.[1] || 'VALUTAZIONE').trim();
        const userMsg = { sender_role: `user:scout`, content: `📷 Mister ha messo sul tavolo la scheda di un calciatore esterno da visionare.` };
        const aiMsg = { sender_role: 'scout', content: output }; setMessages(prev => [...prev, userMsg, aiMsg]);
        try { await supabase.from('shortlist').insert([{ name: pName, position: pRole, verdict: pVerdict, analysis: output }]); await supabase.from('club_messages').insert([userMsg, aiMsg]); } catch(e) {}
      }; reader.readAsDataURL(file);
    } catch (err) { console.error(err); } finally { setIsTyping(false); }
  }

  async function handlePressImageUpload(event) {
    const file = event.target.files[0]; if (!file) return; setIsTyping(true); if (isMobile) setMobileViewTab('chat');
    try {
      const reader = new FileReader(); reader.onloadend = async () => {
        const imagePart = { inlineData: { data: reader.result.split(',')[1], mimeType: file.type } };
        const prompt = `Sei l'Addetto Stampa del club "${clubName}". Analizza lo screen conferenza. Mister adotta stile: Media: ${pressStyle}, Scudo: ${squadShield}, Rivali: ${rivalRelation}. Detta quale pulsante premere per rimanere nel personaggio ed evitare guai mediatici.`;
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent([prompt, imagePart]);
        const userMsg = { sender_role: `user:press`, content: `📷 Mister ha inoltrato uno screenshot della conferenza stampa in corso.` };
        const aiMsg = { sender_role: 'press', content: result.response.text() }; setMessages(prev => [...prev, userMsg, aiMsg]);
        try { await supabase.from('club_messages').insert([userMsg, aiMsg]); } catch(e){}
      }; reader.readAsDataURL(file);
    } catch (err) { console.error(err); } finally { setIsTyping(false); }
  }

  async function handleAnalystImageUpload(event) {
    const file = event.target.files[0]; if (!file) return; setIsTyping(true); if (isMobile) setMobileViewTab('chat');
    try {
      const reader = new FileReader(); reader.onloadend = async () => {
        const imagePart = { inlineData: { data: reader.result.split(',')[1], mimeType: file.type } };
        const prompt = `Sei il Match Analyst del club "${clubName}". Esamina il tabellino di FM26. Compila i campi: AVVERSARIO: [Nome] RISULTATO: [Risultato] XG_TEAM: [xG nostri] XG_OPP: [xG loro] ANALISI: [Analisi dei flussi di gioco nerd e punzecchiature al Vice]`;
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent([prompt, imagePart]); const output = result.response.text();
        const mOpp = (output.match(/AVVERSARIO:\s*(.*)/i)?.[1] || 'Gara di Campionato').trim();
        const mRes = (output.match(/RISULTATO:\s*(.*)/i)?.[1] || 'N/D').trim();
        const mXgT = (output.match(/XG_TEAM:\s*(.*)/i)?.[1] || '-').trim();
        const mXgO = (output.match(/XG_OPP:\s*(.*)/i)?.[1] || '-').trim();
        const userMsg = { sender_role: `user:analyst`, content: `📷 Mister ha caricato il tabellino visivo del fine gara.` };
        const aiMsg = { sender_role: 'analyst', content: output }; setMessages(prev => [...prev, userMsg, aiMsg]);
        try { await supabase.from('matches').insert([{ opponent: mOpp, result: mRes, xg_team: mXgT, xg_opp: mXgO, analysis: output }]); await supabase.from('club_messages').insert([userMsg, aiMsg]); } catch(e) {}
      }; reader.readAsDataURL(file);
    } catch (e) { console.error(e); } finally { setIsTyping(false); }
  }

  async function handleFinanceImageUpload(event) {
    const file = event.target.files[0]; if (!file) return; setIsTyping(true); if (isMobile) setMobileViewTab('chat');
    try {
      const reader = new FileReader(); reader.onloadend = async () => {
        const imagePart = { inlineData: { data: reader.result.split(',')[1], mimeType: file.type } };
        const prompt = `Sei il CFO taccagno del club "${clubName}". Estrai le finanze in JSON puro: { "balance": numero, "transfer_budget": numero, "wage_budget": numero, "analysis": "analisi sarcastica e protettiva delle casse societarie" }`;
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent([prompt, imagePart]);
        const parsed = JSON.parse(result.response.text().replace(/```json/g, '').replace(/```/g, '').trim());
        if (parsed) {
          setFinances({ balance: parsed.balance, transfer_budget: parsed.transfer_budget, wage_budget: parsed.wage_budget });
          const userMsg = { sender_role: `user:cfo`, content: `📷 Mister ha inserito il rendiconto finanziario visivo per l'audit patrimoniale.` };
          const aiMsg = { sender_role: 'cfo', content: parsed.analysis }; setMessages(prev => [...prev, userMsg, aiMsg]);
          try { await supabase.from('club_finances').update({ balance: parsed.balance, transfer_budget: parsed.transfer_budget, wage_budget: parsed.wage_budget }).eq('id', 1); await supabase.from('club_messages').insert([userMsg, aiMsg]); } catch (e) {}
        }
      }; reader.readAsDataURL(file);
    } catch (e) { console.error(e); } finally { setIsTyping(false); }
  }

  // ==========================================
  // CORREZIONE DEL ROGUE SEMICOLON (;) NELL'OGGETTO aiMsg DI handleYouthImageUpload
  // ==========================================
  async function handleYouthImageUpload(event) {
    const file = event.target.files[0]; if (!file) return; setIsTyping(true); if (isMobile) setMobileViewTab('chat');
    try {
      const reader = new FileReader(); reader.onloadend = async () => {
        const base64Data = reader.result.split(',')[1];
        const imagePart = { inlineData: { data: base64Data, mimeType: file.type } };
        const prompt = `Sei il Responsabile Giovanili del club "${clubName}". Esamina lo screen profilo Under 20 di FM26 e dai una valutazione entusiasta e protettiva delle potenzialità reali del ragazzo.`;
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent([prompt, imagePart]);
        
        const userMsg = { sender_role: `user:youth`, content: `📷 Mister ha scansionato il cartellino di un giovane wonderkid del vivaio.` };
        // RIMOSSO IL VECCHIO PUNTO E VIRGOLA ERRORE DI SINTASSI CHE CAUSAVA IL BLOCCO
        const aiMsg = { sender_role: 'youth', content: result.response.text() }; 
        setMessages(prev => [...prev, userMsg, aiMsg]);
        try { await supabase.from('club_messages').insert([userMsg, aiMsg]); } catch(e){}
      }; reader.readAsDataURL(file);
    } catch (e) { console.error(file); } finally { setIsTyping(false); }
  }

  // SANITIZZAZIONE OCR INTELLIGENTE CONTRO I MISMATCH DI SUPABASE
  async function handleImageUploadOCR(event) {
    const file = event.target.files[0]; if (!file) return; setIsUploading(true);
    try {
      const reader = new FileReader(); reader.onloadend = async () => {
        const imagePart = { inlineData: { data: reader.result.split(',')[1], mimeType: file.type } };
        const prompt = `Estrai i calciatori da questa griglia di FM. Nota abbreviazioni (Val, Anni, Stip, Mv). Rispondi SOLO array JSON: [ { "type": "player", "name": "Nome", "age": "num", "position": "Ruolo", "attributes": { "Gol": "num", "Media Voto": "num", "Presenze": "num", "Ingaggio": "txt", "Valore": "txt" } } ]`;
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent([prompt, imagePart]);
        const extractedData = JSON.parse(result.response.text().replace(/```json/g, '').replace(/```/g, '').trim());
        
        if (Array.isArray(extractedData)) {
          const sanitizedData = extractedData.map(p => ({
            name: p?.name || 'Sconosciuto',
            position: p?.position || 'N/D',
            age: parseInt(p?.age) ? parseInt(p?.age) : null, 
            type: p?.type || 'player',
            attributes: p?.attributes || {}
          }));

          setPlayers(prev => {
            const list = [...prev]; sanitizedData.forEach(np => {
              const idx = list.findIndex(x => (x?.name || '').toLowerCase().trim() === (np?.name || '').toLowerCase().trim());
              if (idx >= 0) list[idx] = { ...list[idx], ...np, attributes: { ...list[idx]?.attributes, ...np?.attributes } }; else list.push(np);
            }); return list;
          });

          let { data: dbPlayers } = await supabase.from('players').select('*');
          for (const p of sanitizedData) {
            const match = dbPlayers?.find(x => (x?.name || '').toLowerCase().trim() === (p?.name || '').toLowerCase().trim());
            if (match) {
              await supabase.from('players').update({ age: p.age, position: p.position, attributes: { ...match.attributes, ...p.attributes } }).eq('id', match.id);
            } else {
              await supabase.from('players').insert([p]);
            }
          }
        }
      }; reader.readAsDataURL(file);
    } catch (e) {
      console.error("Errore di allineamento griglia visiva cloud:", e);
    } finally { setIsUploading(false); }
  }

  async function handleAnalyzeExternalTactic() {
    if (!externalTacticInput.trim()) return; setIsTyping(true); if (isMobile) setMobileViewTab('chat');
    const inputBuffer = externalTacticInput; setExternalTacticInput('');
    try {
      const prompt = `Analizza la tattica: """${inputBuffer}""" sulla rosa ${clubName}. Il Vice Allenatore deve fare un report sfacciato di spogliatoio. Metti all'inizio la dicitura TITOLO: [Nome breve]`;
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(prompt); const outputText = result.response.text();
      const cleanTitle = (outputText.match(/TITOLO:\s*(.*)/i)?.[1] || `Tattica del ${new Date().toLocaleDateString()}`).replace('[', '').replace(']', '').trim();
      const userMsg = { sender_role: `user:vice`, content: `📋 Mister ha inoltrato una nuova tattica per la convalida rapida.` };
      const aiMsg = { sender_role: 'vice', content: outputText }; setMessages(prev => [...prev, userMsg, aiMsg]);
      setTacticReports(prev => [{ title: cleanTitle, content: outputText, id: Date.now() }, ...prev]);
      try { await supabase.from('club_messages').insert([userMsg, aiMsg]); } catch(e) {}
    } catch (error) { console.error(error); } finally { setIsTyping(false); }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', flexDirection: isMobile ? 'column' : 'row', backgroundColor: '#090710', color: '#cbd5e1', fontFamily: 'system-ui, -apple-system, sans-serif', overflow: 'hidden' }}>
      
      {/* SEZIONE NAV CONTAINER */}
      <div style={isMobile ? { position: 'fixed', bottom: 0, left: 0, right: 0, height: '70px', width: '100%', backgroundColor: '#140f24', borderTop: '2px solid #231b3a', display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '0 10px', gap: '14px', overflowX: 'auto', zIndex: 1000 } : { width: '90px', backgroundColor: '#140f24', borderRight: '2px solid #231b3a', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '20px', gap: '16px', zIndex: 10 }}>
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

      {/* MODALE DI LETTURA ACCESSO DIRETTO REPORT TATTICI */}
      {selectedTacticReport && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(5, 3, 10, 0.95)', zIndex: 99999, display: 'flex', padding: isMobile ? '10px' : '40px' }}>
          <div style={{ margin: 'auto', width: '100%', maxWidth: '800px', backgroundColor: '#140f24', border: '3px solid #22d3ee', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #231b3a', paddingBottom: '14px', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '22px', fontWeight: '900', color: '#22d3ee' }}>📋 REFERTO TATTICO: {selectedTacticReport?.title?.toUpperCase()}</h3>
              <button onClick={() => setSelectedTacticReport(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={26} /></button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', fontSize: '17px', color: '#ffffff', lineHeight: '1.7', whiteSpace: 'pre-line' }}>{selectedTacticReport?.content}</div>
            <button onClick={() => setSelectedTacticReport(null)} style={{ marginTop: '16px', backgroundColor: '#22d3ee', color: '#000', border: 'none', padding: '14px', fontSize: '14px', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer' }}>Chiudi Documento</button>
          </div>
        </div>
      )}

      {/* FLYOUT SCHEDA ATTRIBUTI + NOTE */}
      {selectedProfile && (
        <div style={{ position: 'fixed', right: isMobile ? '10px' : '25px', bottom: isMobile ? '80px' : '25px', left: isMobile ? '10px' : 'auto', width: isMobile ? 'calc(100% - 20px)' : '340px', backgroundColor: '#140f24', border: '3px solid #da1b60', padding: '16px', borderRadius: '12px', boxShadow: '0 30px 60px rgba(0,0,0,0.9)', zIndex: 5000, boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #231b3a', paddingBottom: '10px', marginBottom: '12px', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '10px', color: '#da1b60', fontWeight: '900' }}>FASCICOLO CALCIATORE</span>
              <h4 style={{ fontSize: '18px', color: '#ffffff', margin: '2px 0 0 0', fontWeight: '900' }}>{selectedProfile?.name}</h4>
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
              <button onClick={handleSavePlayerNotes} disabled={isSavingNotes} style={{ backgroundColor: '#a855f7', color: '#fff', border: 'none', padding: '10px', fontSize: '12px', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer', textTransform: 'uppercase' }}>Salva Note</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default App
