import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient'
import { MessageSquare, Database, Settings, Send, Users, Sliders, TrendingUp, ImageIcon, X, CloudOff, Briefcase, ChevronRight, HelpCircle, Award, Activity, Search } from 'lucide-react'
import { GoogleGenerativeAI } from '@google/generative-ai'

// CONFIGURAZIONE CHIAVE GEMINI PRO-GRADE PROTETTA DA VARIABILE D'AMBIENTE PER VERCEL
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

function App() {
  // CONFIGURAZIONE DELLE STANZE DEL QUARTIER GENERALE DIRIGENZIALE
  const [activeRoom, setActiveRoom] = useState('board') 
  const [dbSubTab, setDbSubTab] = useState('first_team') 
  
  // STATO COMPLESSO PER L'ORDINAMENTO UNIVERSALE DEL DATABASE
  const [sortField, setSortField] = useState('name')
  const [sortDirection, setSortDirection] = useState('asc')
  
  // STATO DELL'ORGANICO IDRATATO CON STRUTTURA IBRIDA (LOCAL CACHE + CLOUD)
  const [clubName, setClubName] = useState(() => localStorage.getItem('hq_club_name') || 'Sora')
  const [players, setPlayers] = useState(() => JSON.parse(localStorage.getItem('hq_players')) || [])
  const [staffList, setStaffList] = useState(() => JSON.parse(localStorage.getItem('hq_staff')) || [])
  const [messages, setMessages] = useState(() => JSON.parse(localStorage.getItem('hq_messages')) || [
    { sender_role: 'system', content: 'Centrale operativa allineata. I database locali e cloud sono stati fusi. Scegli una stanza per iniziare il briefing con lo staff.' }
  ])
  
  // STATO PARAMETRI FINANZIARI SOCIETARI LIVE
  const [finances, setFinances] = useState(() => {
    const local = localStorage.getItem('hq_finances');
    return local ? JSON.parse(local) : { balance: 2500000, transfer_budget: 800000, wage_budget: 15000 };
  })

  // STATO FILTRO PERSONALITÀ ALLENATORE PER BRIEFING MEDIA RELATIONS
  const [personality, setPersonality] = useState(() => localStorage.getItem('hq_coach_personality') || 'professional')

  // PARAMETRI DEL SIMULATORE DI AMMORTAMENTO MERCATO MONEYBALL
  const [simCost, setSimCost] = useState('500000')
  const [simWage, setSimWage] = useState('2000')
  const [simYears, setSimYears] = useState('3')
  const [simResult, setSimResult] = useState(null)

  // STATI DI CARICAMENTO E BUFFER DI OUTPUT DELLE OPERAZIONI DELLO STAFF
  const [externalTacticInput, setExternalTacticInput] = useState('')
  const [tacticAnalysisResult, setTacticAnalysisResult] = useState('')
  const [isAnalyzingTactic, setIsAnalyzingTactic] = useState(false)
  const [financeAudit, setFinanceAudit] = useState('')
  const [isAuditing, setIsAuditing] = useState(false)
  const [pressAnalysisResult, setPressAnalysisResult] = useState('')
  const [isAnalyzingPress, setIsAnalyzingPress] = useState(false)
  const [youthAnalysisResult, setYouthAnalysisResult] = useState('')
  const [isAnalyzingYouth, setIsAnalyzingYouth] = useState(false)
  const [analystAnalysisResult, setAnalystAnalysisResult] = useState('')
  const [isAnalyzingAnalyst, setIsAnalyzingAnalyst] = useState(false)
  const [financeAnalysisResult, setFinanceAnalysisResult] = useState('')
  const [isAnalyzingFinance, setIsAnalyzingFinance] = useState(false)
  const [scoutAnalysisResult, setScoutAnalysisResult] = useState('')
  const [isAnalyzingScout, setIsAnalyzingScout] = useState(false)

  const [selectedProfile, setSelectedProfile] = useState(null) 
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

  // PERSISTENZA SINCRONA SUL PC LOCALE (LOCALSTORAGE)
  useEffect(() => { localStorage.setItem('hq_players', JSON.stringify(players)) }, [players])
  useEffect(() => { localStorage.setItem('hq_staff', JSON.stringify(staffList)) }, [staffList])
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

  // ==========================================
  // FUNZIONI LOGICHE CON ESTRAZIONE HOISTED COMPLETA
  // ==========================================
  async function fetchCloudData() {
    try {
      let { data: pData, error: pErr } = await supabase.from('players').select('*').order('name')
      if (pErr) throw pErr
      if (pData && pData.length > 0) setPlayers(pData)

      let { data: sData, error: sErr } = await supabase.from('staff').select('*').order('name')
      if (sErr) throw sErr
      if (sData && sData.length > 0) setStaffList(sData)
      
      let { data: fData, error: fErr } = await supabase.from('club_finances').select('*').eq('id', 1).single()
      if (fErr && fErr.code !== 'PGRST116') throw fErr
      if (fData) {
        setFinances({ balance: fData.balance, transfer_budget: fData.transfer_budget, wage_budget: fData.wage_budget })
      } else {
        await supabase.from('club_finances').insert([{ id: 1, balance: finances.balance, transfer_budget: finances.transfer_budget, wage_budget: finances.wage_budget }]);
      }
      
      let { data: mData, error: mErr } = await supabase.from('club_messages').select('*').order('created_at', { ascending: true })
      if (mErr) throw mErr
      if (mData && mData.length > 0) setMessages(mData)
      
      setCloudStatus('online')
    } catch (err) {
      console.warn("Rete Cloud irraggiungibile. Sincronizzazione fail-safe locale attiva.", err)
      setCloudStatus('offline')
    }
  }

  async function updateFinancesCloud(field, value) {
    const numValue = parseFloat(value) || 0;
    const updatedFinances = { ...finances, [field]: numValue };
    setFinances(updatedFinances);
    try {
      await supabase.from('club_finances').update({ [field]: numValue }).eq('id', 1);
    } catch (e) {
      setCloudStatus('offline');
    }
  }

  function updateCoachPersonality(val) {
    setPersonality(val);
  }

  async function fileToGenerativePart(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve({ inlineData: { data: reader.result.split(',')[1], mimeType: file.type } });
      reader.readAsDataURL(file);
    });
  }

  async function handleScoutImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    setIsAnalyzingScout(true);
    setScoutAnalysisResult("Il Capo Osservatore sta tracciando gli attributi del calciatore...");
    try {
      const imagePart = await fileToGenerativePart(file);
      const squadContext = players.map(p => ({ nome: p.name, ruolo: p.position, stats: p.attributes }));
      const prompt = `Sei il Capo Osservatore d'élite del club "${clubName}". Esamina lo screenshot di questo giocatore esterno. Sputa un verdetto in maiuscolo (ACQUISTARE ASSOLUTAMENTE, VALIDO SOLO COME RISERVA, EVITARE/BOCCIATO). Confrontalo con l'organico attuale che controlliamo per evitare doppioni inutili: ${JSON.stringify(squadContext.slice(0, 35))}. Valuta gli attributi chiave in base al Match Engine di FM26.`;
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent([prompt, imagePart]);
      setScoutAnalysisResult(result.response.text());
    } catch (err) {
      setScoutAnalysisResult(`Errore osservatore: ${err.message}`);
    } {
      setIsAnalyzingScout(false);
    }
  }

  async function handlePressImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    setIsAnalyzingPress(true);
    setPressAnalysisResult("L'Addetto Stampa sta strutturando la risposta strategica...");
    try {
      const imagePart = await fileToGenerativePart(file);
      const prompt = `Sei l'Addetto Stampa del club "${clubName}". Analizza questo screenshot di conferenza su FM26. Il Mister ha impostato l'identità mediatica: "${personality.toUpperCase()}". Trascrivi la domanda ed indica esattamente quale pulsante premere nel gioco per interpretare alla perfezione il personaggio scelto senza distruggere la determinazione dei ragazzi o causare rivolte di spogliatoio.`;
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent([prompt, imagePart]);
      setPressAnalysisResult(result.response.text());
    } catch (err) {
      setPressAnalysisResult(`Errore addetto stampa: ${err.message}`);
    } {
      setIsAnalyzingPress(false);
    }
  }

  async function handleAnalystImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    setIsAnalyzingAnalyst(true);
    setAnalystAnalysisResult("Il Match Analyst sta elaborando i dati fisici di gara...");
    try {
      const imagePart = await fileToGenerativePart(file);
      const prompt = `Sei il Match Analyst del club "${clubName}". Esamina lo screenshot di dati, tiri o xG di FM26. FASE 1: Estrai i dati di performance (Tiri, possesso, xG totali, errori di reparto). FASE 2: Fornisci istruzioni di squadra algoritmiche da cambiare subito nei pannelli di FM per correggere i blackout.`;
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent([prompt, imagePart]);
      setAnalystAnalysisResult(result.response.text());
    } catch (e) {
      setAnalystAnalysisResult("Errore di match analysis visiva.");
    } {
      setIsAnalyzingAnalyst(false);
    }
  }

  async function handleFinanceImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    setIsAnalyzingFinance(true);
    setFinanceAnalysisResult("Il CFO sta decifrando le proiezioni di bilancio societarie...");
    try {
      const imagePart = await fileToGenerativePart(file);
      const prompt = `Sei il CFO del club "${clubName}". Estrai Cassa, Budget Mercato e Budget Ingaggi da questo screen finanziario di FM26. Rispondi SOLO con JSON puro tra parentesi graffe, senza scritte o markdown: { "balance": numero, "transfer_budget": numero, "wage_budget": numero, "analysis": "analisi moneyball dettagliata su come sviluppare un sistema economico sostenibile per il club" }`;
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent([prompt, imagePart]);
      const jsonClean = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(jsonClean);
      if (parsed) {
        setFinances({ balance: parsed.balance, transfer_budget: parsed.transfer_budget, wage_budget: parsed.wage_budget });
        setFinanceAnalysisResult(parsed.analysis);
        try { await supabase.from('club_finances').update({ balance: parsed.balance, transfer_budget: parsed.transfer_budget, wage_budget: parsed.wage_budget }).eq('id', 1); } catch (e) {}
      }
    } catch (e) {
      setFinanceAnalysisResult("Errore scansione contabile visiva.");
    } {
      setIsAnalyzingFinance(false);
    }
  }

  async function handleYouthImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    setIsAnalyzingYouth(true);
    setYouthAnalysisResult("Il Wiwaio sta valutando la crescita atletica...");
    try {
      const imagePart = await fileToGenerativePart(file);
      const prompt = `Sei il Responsabile Giovanili del club "${clubName}". Esamina lo screenshot profilo Under 20 di FM26. Detta i punti di forza, la personalità, il livello di determinazione e stila il ruolo e focus di allenamento perfetto per massimizzare la crescita nel Match Engine.`;
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent([prompt, imagePart]);
      setYouthAnalysisResult(result.response.text());
    } catch (e) {
      setYouthAnalysisResult("Errore lettura vivaio.");
    } {
      setIsAnalyzingYouth(false);
    }
  }

  async function handleImageUploadOCR(event) {
    const file = event.target.files[0];
    if (!file) return;
    setIsUploading(true);
    setUploadError(null);
    try {
      const imagePart = await fileToGenerativePart(file);
      const prompt = `Estrai i giocatori da questa tabella screenshot di FM. Rispondi SOLO array JSON racchiuso in parentesi quadre: [ { "type": "player", "name": "Nome", "age": num, "position": "Ruolo", "attributes": { "Gol": "num", "Media Voto": "num", "Presenze": "num", "Ingaggio": "txt", "Valore": "txt" } } ]`;
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent([prompt, imagePart]);
      const extractedData = JSON.parse(result.response.text().replace(/```json/g, '').replace(/```/g, '').trim());
      if (Array.isArray(extractedData) && extractedData.length > 0) {
        const newPlayers = extractedData.filter(i => (i.type || 'player').toLowerCase().trim() === 'player');
        if (newPlayers.length > 0) {
          setPlayers(prev => {
            const currentList = [...prev];
            newPlayers.forEach(np => {
              const cleanedName = (np.name || 'Sconosciuto').toLowerCase().trim();
              const foundIdx = currentList.findIndex(x => x.name.toLowerCase().trim() === cleanedName);
              if (foundIdx >= 0) {
                currentList[foundIdx] = { ...currentList[foundIdx], age: np.age || currentList[foundIdx].age, position: np.position || currentList[foundIdx].position, attributes: { ...currentList[foundIdx].attributes, ...(np.attributes || {}) } };
              } else { currentList.push({ ...np, type: 'player', name: np.name || 'Sconosciuto', attributes: np.attributes || {} }); }
            });
            return currentList;
          });
          try {
            let { data: dbPlayers } = await supabase.from('players').select('*');
            for (const p of newPlayers) {
              const match = dbPlayers?.find(x => x.name.toLowerCase().trim() === p.name.toLowerCase().trim());
              if (match) { await supabase.from('players').update({ age: p.age || match.age, position: p.position || match.position, attributes: { ...match.attributes, ...(p.attributes || {}) } }).eq('id', match.id); }
              else { await supabase.from('players').insert([{ name: p.name, age: p.age, position: p.position, type: 'player', attributes: p.attributes || {} }]); }
            }
          } catch (e) {}
        }
        setDbSubTab('first_team');
      }
    } catch (err) { setUploadError(`Errore OCR: ${err.message}`); } finally { setIsUploading(false); }
  }

  // CORE ENGINE CHAT: SEGREGRAZIONE DELLE CHAT CON MODELLO STABILE "GEMINI-1.5-FLASH"
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
      const squadContext = players.map(p => ({ nome: p.name, ruolo: p.position, stats: p.attributes }));
      const businessChronology = updatedMessages.slice(-45).map(m => {
        let roleLabel = m.sender_role.toUpperCase();
        if (roleLabel.startsWith('USER:')) {
          roleLabel = `MISTER (nella stanza ${roleLabel.split(':')[1]})`;
        } else if (roleLabel === 'USER') {
          roleLabel = 'MISTER';
        }
        return `${roleLabel}: ${m.content}`;
      }).join('\n');

      let instructionPrompt = `
        SEI LO STAFF DIRIGENZIALE ED ESPERTO DEL CLUB "${clubName.toUpperCase()}" SU FOOTBALL MANAGER 2026.
        Il tuo Mister (Omiserez) ti dice: "${currentInputText}"
        
        CRONOLOGIA E MEMORIA INTERNA AZIENDALE (RICORDA QUESTI DETTAGLI DI TUTTE LE STANZE):
        ${businessChronology}
        
        REGISTRO CONTABILE ED ORGANICO SQUADRA:
        - Cassa €${finances.balance} | Budget Mercato €${finances.transfer_budget} | Ingaggi €${finances.wage_budget}/sett.
        - ROSA ESTRATTA DAGLI SCREENSHOT: ${JSON.stringify(squadContext.slice(0, 35))}
      `;

      if (activeRoom === 'board') {
        instructionPrompt += `
          REGOLE TAVOLO PLENARIA (IL TAVOLONE COMPLETO):
          Sei l'intero consiglio dello staff convocato in riunione segreta dal Mister. Devi generare tassativamente una risposta complessa in cui TUTTI E 7 i collaboratori prendono la parola uno dopo l'altro esprimendo la propria opinione dal loro specifico angolo di competenza.
          Rispetta fedelmente questo formato di testo ad ampio volume (fai parlare tutti e 7):
          
          VICE ALLENATORE: [Opinione di campo, assetto tattico e morale]
          DIRETTORE SPORTIVO: [Opinione commerciale su contratti e mercato]
          CHIEF SCOUT: [Opinione tecnica su futuribilità obiettivi]
          CFO FINANZE: [Opinione contabile rigida su ammortamento e cassa]
          ADDETTO STAMPA: [Opinione su reazione dei media e tifosi]
          RESPONSABILE GIOVANILI: [Opinione sulla crescita dei ragazzi Under 20]
          MATCH ANALYST: [Opinione fredda basata su xG e statistiche Match Engine]
        `;
      } else {
        instructionPrompt += `
          STANZA SINGOLA ATTIVA: SEI NELL'UFFICIO PRIVATO DI '${activeRoom.toUpperCase()}'.
          Rispondi al Mister interpretando ESCLUSIVAMENTE questo ruolo specifico in modo diretto, esteso e ultra-competente. Non tirare in ballo gli altri reparti, parla a quattrocchi con lui.
          - 'vice': Focus su tattiche, allenamento, ruoli e campo.
          - 'ds': Focus su rinnovi, acquisti, esuberi e scadenze.
          - 'scout': Focus su schedatura obiettivi esterni e database osservatori.
          - 'cfo': Focus su bilancio puro, ammortamenti e conti societari.
          - 'press': Focus su conferenze e interpretazione della personalità mediatica "${personality.toUpperCase()}".
          - 'youth': Focus su valorizzazione dei giovani Under 20.
          - 'analyst': Focus su xG, tiri, baricentro e modifiche istruzioni di squadra FM.
        `;
      }

      // CAMBIATO IN GEMINI-1.5-FLASH PER BLOCCARE GLI ERRORI 400 DI BAD REQUEST
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(instructionPrompt);
      const aiMessageObj = { sender_role: activeRoom, content: result.response.text() };
      setMessages(prev => [...prev, aiMessageObj]);
      try { await supabase.from('club_messages').insert([aiMessageObj]); } catch(e) {}
    } catch (error) { console.error(error); } {
      setIsTyping(false);
    }
  }

  async function handleAnalyzeExternalTactic() {
    if (!externalTacticInput.trim()) return;
    setIsAnalyzingTactic(true); setTacticAnalysisResult("Incrocio flussi tattici avanzati...");
    try {
      const currentSquadContext = players.map(p => ({ nome: p.name, ruolo: p.position, stats: p.attributes }));
      const prompt = `Analizza questa tattica: """${externalTacticInput}""" sulla rosa ${clubName}: ${JSON.stringify(currentSquadContext.slice(0, 40))}. Dividi l'output in FASE 1 (70% analisi modulo nel Match Engine) e FASE 2 (30% screening nomi esatti promossi e bocciati da cedere).`;
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent([prompt, currentSquadContext]);
      setTacticAnalysisResult(result.response.text());
    } catch (error) { setTacticAnalysisResult("Errore."); } finally { setIsAnalyzingTactic(false); }
  }

  function handleSimulateTransfer() {
    const cost = parseFloat(simCost) || 0; const weeklyWage = parseFloat(simWage) || 0; const years = parseInt(simYears) || 1;
    const annualAmortization = cost / years; const annualWageCost = weeklyWage * 52; const totalAnnualImpact = annualAmortization + annualWageCost;
    let status = 'APPROVATO'; let color = '#34d399'; let notes = `Operazione approvata. Impatto annuo ammortizzato complessivo: €${totalAnnualImpact.toLocaleString()}.`;
    if (cost > finances.transfer_budget) { status = 'BLOCCATO'; color = '#ef4444'; notes = `Fondi insufficienti nel budget trasferimenti del club.`; }
    else if (weeklyWage > (finances.wage_budget * 0.3)) { status = 'RISCHIO CRISI SPOGLIATOIO'; color = '#ffaa00'; notes = `L'ingaggio supera il 30% del tetto salariale rimasto.`; }
    setSimResult({ status, color, annualAmortization, annualWageCost, notes });
  }

  async function handleFinanceAudit() {
    setIsAuditing(true); setFinanceAudit("Generazione audit contabile...");
    try {
      const soraPlayersContext = players.map(p => ({ nome: p.name, ruolo: p.position, stipendio: p.attributes['Ingaggio'] || '-' }));
      const prompt = `CFO Club ${clubName}. Redigi un audit finanziario Moneyball dettagliato e cinico: Cassa: €${finances.balance}. Contratti della rosa: ${JSON.stringify(soraPlayersContext.slice(0, 35))}`;
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(prompt);
      setFinanceAudit(result.response.text());
    } catch (e) {} finally { setIsAuditing(false); }
  }

  async function handleClearAllData() {
    if (window.confirm("Vuoi azzerare la sede e ricominciare la stagione da zero?")) {
      setPlayers([]); setStaffList([]); setMessages([{ sender_role: 'system', content: 'Centrale resettata.' }]);
      setFinances({ balance: 2500000, transfer_budget: 800000, wage_budget: 15000 }); setSelectedProfile(null); localStorage.clear();
      try { await supabase.from('players').delete().neq('id', 0); await supabase.from('club_messages').delete().neq('id', 0); } catch(e) {}
    }
  }

  function handleSort(field) {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }

  // ==========================================
  // APERTURA INTERFACCIA CHAT INTERAMENTE RIPENSATA CONTRO IL VUOTO DISPERSIVO
  // ==========================================
  function renderChatWindow() {
    const visibleMessages = messages.filter(msg => {
      if (msg.sender_role === 'system') return true;
      if (activeRoom === 'board') {
        return msg.sender_role === 'board' || msg.sender_role === 'user:board' || msg.sender_role === 'user';
      }
      return msg.sender_role === activeRoom || msg.sender_role === `user:${activeRoom}`;
    });

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#0d0a16', height: '100%' }}>
        {/* BARRA SUPERIORE TITOLI ENORMI */}
        <div style={{ height: '75px', padding: '0 24px', borderBottom: '2px solid #231b3a', display: 'flex', alignItems: 'center', backgroundColor: '#140f24', justifyContent: 'space-between', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <MessageSquare size={24} color="#da1b60" /> 
            <h2 style={{ fontSize: '22px', color: '#ffffff', margin: 0, textTransform: 'uppercase', fontWeight: '900', letterSpacing: '0.5px' }}>
              {activeRoom === 'board' ? '🏛️ RIUNIONE PLENARIA CON LO STAFF' : `💼 BRIEFING PRIVATO: ${activeRoom.toUpperCase()}`}
            </h2>
          </div>
          {cloudStatus === 'offline' && <div style={{ fontSize: '12px', backgroundColor: '#5f0f0f', color: '#fca5a5', padding: '6px 12px', border: '1px solid #b91c1c', fontWeight: 'bold', borderRadius: '4px' }}>OFFLINE CACHE ACTIVE</div>}
        </div>

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', flexDirection: 'row' }}>
          {/* VANO CENTRALIZZATO CHAT CON CARATTERI ESPANSI */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', borderRight: '2px solid #231b3a', backgroundColor: '#090710' }}>
            <div ref={chatContainerRef} style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* SCHERMATA EMPTY STATE COMPATTA CONTRO LO SPAZIO DISPERSIVO */}
              {visibleMessages.length === 0 ? (
                <div style={{ margin: 'auto', maxWidth: '600px', backgroundColor: '#140f24', border: '2px solid #da1b60', padding: '32px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
                  <Users size={48} color="#da1b60" style={{ margin: '0 auto 16px auto' }} />
                  <h3 style={{ fontSize: '22px', color: '#fff', margin: '0 0 12px 0', fontWeight: '800' }}>Ufficio Operazioni Allineato</h3>
                  <p style={{ color: '#94a3b8', fontSize: '15px', lineHeight: '1.6', margin: '0 0 20px 0' }}>
                    Sei a colloquio a porte chiuse. Lo specialista ha accesso alla memoria storica del club (45 messaggi) e analizzerà ogni screenshot o dato che invierai in tempo reale.
                  </p>
                  <div style={{ backgroundColor: '#0d0a16', padding: '14px', borderRadius: '6px', fontSize: '13px', color: '#22d3ee', fontWeight: 'bold', border: '1px solid #231b3a', textTransform: 'uppercase' }}>
                    ✍️ Digita una nota in basso o carica un file multimediale a destra per iniziare
                  </div>
                </div>
              ) : (
                visibleMessages.map((msg, index) => {
                  let align = 'flex-start'; let bColor = '#2c2347'; let nameLabel = 'STAFF'; let itemBg = '#140f24';
                  if (msg.sender_role.startsWith('user')) { align = 'flex-end'; bColor = '#da1b60'; nameLabel = 'MISTER (OMISEREZ)'; itemBg = '#1d1433'; }
                  else if (msg.sender_role === 'vice') { bColor = '#22d3ee'; nameLabel = 'VICE ALLENATORE'; }
                  else if (msg.sender_role === 'ds') { bColor = '#fbbf24'; nameLabel = 'DIRETTORE SPORTIVO'; }
                  else if (msg.sender_role === 'scout') { bColor = '#f43f5e'; nameLabel = 'CAPO OSSERVATORE'; }
                  else if (msg.sender_role === 'cfo') { bColor = '#10b981'; nameLabel = 'CFO FINANZE'; }
                  else if (msg.sender_role === 'press') { bColor = '#ec4899'; nameLabel = 'UFFICIO STAMPA'; }
                  else if (msg.sender_role === 'youth') { bColor = '#ffaa00'; nameLabel = 'RESPONSABILE GIOVANILI'; }
                  else if (msg.sender_role === 'analyst') { bColor = '#3b82f6'; nameLabel = 'MATCH ANALYST'; }
                  else if (msg.sender_role === 'board') { bColor = '#a855f7'; nameLabel = 'VERBALE PLENARIA COMPLETA'; }

                  return (
                    <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: align, width: '100%' }}>
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '900', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>{nameLabel}</span>
                      <div style={{ padding: '16px', fontSize: '16px', backgroundColor: itemBg, color: '#ffffff', borderLeft: `4px solid ${bColor}`, borderRadius: '6px', maxWidth: '85%', lineHeight: '1.6', whiteSpace: 'pre-line', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>{msg.content}</div>
                    </div>
                  );
                })
              )}
              {isTyping && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '11px', color: '#475569', fontWeight: 'bold', marginBottom: '4px' }}>SCRIVANIA DEL RESPONSABILE</span>
                  <div style={{ padding: '14px', fontSize: '15px', backgroundColor: '#140f24', color: '#64748b', borderLeft: '4px solid #475569', borderRadius: '6px', fontStyle: 'italic' }}>Lo specialista sta scrivendo la risposta tecnica...</div>
                </div>
              )}
            </div>

            {/* SEZIONE INPUT GRANDE E AD ALTO CONTRASTO */}
            <div style={{ padding: '20px', backgroundColor: '#140f24', borderTop: '2px solid #231b3a', boxShadow: '0 -4px 15px rgba(0,0,0,0.3)' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <ChevronRight style={{ position: 'absolute', left: '14px', color: '#da1b60' }} size={20} />
                <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder={activeRoom === 'board' ? "Ordina una discussione generale al Tavolone..." : `Invia un quesito diretto in modalità singola a: ${activeRoom.toUpperCase()}...`} style={{ width: '100%', backgroundColor: '#090710', border: '2px solid #231b3a', padding: '16px 50px 16px 42px', fontSize: '16px', color: '#ffffff', borderRadius: '8px', outline: 'none', fontWeight: '500' }} />
                <button onClick={handleSendMessage} disabled={isTyping} style={{ position: 'absolute', right: '16px', background: 'none', border: 'none', color: '#da1b60', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Send size={18} /></button>
              </div>
            </div>
          </div>

          {/* PANNELLO STRUMENTI SULLA DESTRA ORDINATO E COMPATTO */}
          <div style={{ width: '380px', backgroundColor: '#0f0c1b', padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', borderLeft: '1px solid #231b3a' }}>
            {activeRoom === 'board' && (
              <>
                <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#a855f7', borderBottom: '2px solid #231b3a', paddingBottom: '8px', margin: 0, fontWeight: '900', letterSpacing: '0.5px' }}>Dati Identità Club</h3>
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
                <textarea value={externalTacticInput} onChange={(e) => setExternalTacticInput(e.target.value)} placeholder="Incolla qui l'analisi testo di una tattica esterna (es. da FMScout)..." style={{ width: '93%', height: '150px', backgroundColor: '#090710', border: '2px solid #231b3a', padding: '12px', color: '#ffffff', fontSize: '14px', resize: 'none', borderRadius: '6px' }} />
                <button onClick={handleAnalyzeExternalTactic} disabled={isAnalyzingTactic} style={{ backgroundColor: '#22d3ee', color: '#0f0b1b', border: 'none', padding: '12px', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', borderRadius: '6px', cursor: 'pointer', width: '100%' }}>Avvia Convalida Modulo</button>
                {tacticAnalysisResult && <div style={{ backgroundColor: '#090710', border: '1px solid #231b3a', padding: '14px', fontSize: '13px', whiteSpace: 'pre-line', color: '#e2e8f0', borderRadius: '6px', lineHeight: '1.5' }}>{tacticAnalysisResult}</div>}
              </>
            )}

            {activeRoom === 'scout' && (
              <>
                <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#f43f5e', borderBottom: '2px solid #231b3a', paddingBottom: '8px', margin: 0, fontWeight: '900' }}>Osservatorio Acquisti</h3>
                <input type="file" accept="image/*" ref={scoutInputRef} onChange={handleScoutImageUpload} style={{ display: 'none' }} />
                <button onClick={() => scoutInputRef.current.click()} disabled={isAnalyzingScout} style={{ width: '100%', backgroundColor: '#f43f5e', color: '#ffffff', border: 'none', padding: '14px', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', borderRadius: '6px', cursor: 'pointer' }}>Carica Profilo Obiettivo</button>
                {scoutAnalysisResult && <div style={{ backgroundColor: '#090710', border: '1px solid #231b3a', padding: '14px', fontSize: '13px', whiteSpace: 'pre-line', color: '#e2e8f0', borderRadius: '6px', lineHeight: '1.5' }}>{scoutAnalysisResult}</div>}
              </>
            )}

            {activeRoom === 'ds' && (
              <>
                <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#fbbf24', borderBottom: '2px solid #231b3a', paddingBottom: '8px', margin: 0, fontWeight: '900' }}>Alert Contratti</h3>
                <div style={{ backgroundColor: '#140f24', border: '1px solid #231b3a', padding: '16px', borderRadius: '6px', fontSize: '14px', lineHeight: '1.6' }}>
                  <span style={{ color: '#fbbf24', fontWeight: 'bold', display: 'block', marginBottom: '8px', textTransform: 'uppercase', fontSize: '12px' }}>⚠️ STRUTTURA SALARIALE:</span>
                  I giocatori contrassegnati come <strong style={{ color: '#ef4444' }}>TOSSICO</strong> nella tabella organico pesano sul bilancio e offrono rendimenti scarsi. Taglia o vendi subito per fare spazio in cassa.
                </div>
              </>
            )}

            {activeRoom === 'cfo' && (
              <>
                <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#10b981', borderBottom: '2px solid #231b3a', paddingBottom: '8px', margin: 0, fontWeight: '900' }}>Cassaforte & Sviluppo Bilanci</h3>
                <div style={{ backgroundColor: '#140f24', border: '1px solid #231b3a', padding: '14px', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 'bold', textTransform: 'uppercase' }}>📊 Scansione Bilancio OCR:</span>
                  <input type="file" accept="image/*" ref={financeInputRef} onChange={handleFinanceImageUpload} style={{ display: 'none' }} />
                  <button onClick={() => financeInputRef.current.click()} disabled={isAnalyzingFinance} style={{ width: '100%', backgroundColor: '#10b981', color: '#0f0c1b', border: 'none', padding: '12px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer', borderRadius: '4px' }}>Carica Screen Finanze</button>
                  {financeAnalysisResult && <div style={{ backgroundColor: '#090710', border: '1px solid #231b3a', padding: '10px', fontSize: '12px', color: '#cbd5e1', maxHeight: '120px', overflowY: 'auto', borderRadius: '4px' }}>{financeAnalysisResult}</div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                  <div><label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold' }}>Bilancio (€)</label><input type="number" value={finances.balance} onChange={(e) => updateFinancesCloud('balance', e.target.value)} style={{ width: '92%', backgroundColor: '#090710', border: '2px solid #231b3a', padding: '8px', color: '#10b981', fontWeight: 'bold', borderRadius: '4px' }} /></div>
                  <div><label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold' }}>Budget Mercato (€)</label><input type="number" value={finances.transfer_budget} onChange={(e) => updateFinancesCloud('transfer_budget', e.target.value)} style={{ width: '92%', backgroundColor: '#090710', border: '2px solid #231b3a', padding: '8px', color: '#fff', borderRadius: '4px' }} /></div>
                  <div><label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold' }}>Ingaggi (€/sett)</label><input type="number" value={finances.wage_budget} onChange={(e) => updateFinancesCloud('wage_budget', e.target.value)} style={{ width: '92%', backgroundColor: '#090710', border: '2px solid #231b3a', padding: '8px', color: '#fff', borderRadius: '4px' }} /></div>
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
                <button onClick={handleFinanceAudit} disabled={isAuditing} style={{ backgroundColor: '#da1b60', color: '#fff', border: 'none', padding: '8px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer', borderRadius: '4px', width: '100%' }}>Genera Audit Contabile</button>
                {financeAudit && <div style={{ backgroundColor: '#090710', border: '1px solid #231b3a', padding: '10px', fontSize: '12px', whiteSpace: 'pre-line', maxHeight: '100px', overflowY: 'auto', color: '#fff', borderRadius: '4px' }}>{financeAudit}</div>}
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
                    <option value="calculated">📊 Calculated (Pragmatico / xG)</option>
                  </select>
                </div>
                <input type="file" accept="image/*" ref={pressInputRef} onChange={handlePressImageUpload} style={{ display: 'none' }} />
                <button onClick={() => pressInputRef.current.click()} disabled={isAnalyzingPress} style={{ width: '100%', backgroundColor: '#ec4899', color: '#fff', border: 'none', padding: '12px', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', borderRadius: '6px', cursor: 'pointer' }}>Carica Conferenza FM</button>
                {pressAnalysisResult && <div style={{ backgroundColor: '#090710', border: '1px solid #231b3a', padding: '14px', fontSize: '13px', whiteSpace: 'pre-line', color: '#cbd5e1', maxHeight: '220px', overflowY: 'auto', borderRadius: '6px' }}>{pressAnalysisResult}</div>}
              </>
            )}

            {activeRoom === 'youth' && (
              <>
                <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#ffaa00', borderBottom: '2px solid #231b3a', paddingBottom: '8px', margin: 0, fontWeight: '900' }}>Vivaio Under 20</h3>
                <input type="file" accept="image/*" ref={youthInputRef} onChange={handleYouthImageUpload} style={{ display: 'none' }} />
                <button onClick={() => youthInputRef.current.click()} disabled={isAnalyzingYouth} style={{ width: '100%', backgroundColor: '#ffaa00', color: '#0f0c1b', border: 'none', padding: '12px', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', borderRadius: '6px', cursor: 'pointer' }}>Carica Screen Wonderkid</button>
                {youthAnalysisResult && <div style={{ backgroundColor: '#090710', border: '1px solid #231b3a', padding: '14px', fontSize: '13px', whiteSpace: 'pre-line', color: '#cbd5e1', borderRadius: '6px' }}>{youthAnalysisResult}</div>}
              </>
            )}

            {activeRoom === 'analyst' && (
              <>
                <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#3b82f6', borderBottom: '2px solid #231b3a', paddingBottom: '8px', margin: 0, fontWeight: '900' }}>Match Analysis Center</h3>
                <input type="file" accept="image/*" ref={analystInputRef} onChange={handleAnalystImageUpload} style={{ display: 'none' }} />
                <button onClick={() => analystInputRef.current.click()} disabled={isAnalyzingAnalyst} style={{ width: '100%', backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '12px', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', borderRadius: '6px', cursor: 'pointer' }}>Carica Tabellino Gara</button>
                {analystAnalysisResult && <div style={{ backgroundColor: '#090710', border: '1px solid #231b3a', padding: '14px', fontSize: '13px', whiteSpace: 'pre-line', color: '#cbd5e1', borderRadius: '6px' }}>{analystAnalysisResult}</div>}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderMasterDatabase() {
    const firstTeamPlayers = players.filter(p => p.type === 'player' && (p.age >= 20 || !p.age));
    const youthPlayers = players.filter(p => p.type === 'player' && p.age && p.age < 20);
    const visibleList = dbSubTab === 'first_team' ? firstTeamPlayers : youthPlayers;

    const getSortValue = (player, field) => {
      switch(field) {
        case 'name': return (player.name || '').toLowerCase().trim();
        case 'position': return (player.position || '').toLowerCase().trim();
        case 'age': return parseInt(player.age) || 0;
        case 'pres': {
          const v = player.attributes?.Presenze || player.attributes?.Pres || '0';
          return parseInt(String(v).replace(/\D/g, '')) || 0;
        }
        case 'gol': {
          const v = player.attributes?.Gol || player.attributes?.Gls || '0';
          return parseInt(String(v).replace(/\D/g, '')) || 0;
        }
        case 'mv': {
          const v = player.attributes?.['Media Voto'] || player.attributes?.Mv || '0';
          return parseFloat(String(v).replace(',', '.')) || 0;
        }
        case 'ingaggio': {
          const v = player.attributes?.Ingaggio || player.attributes?.Stip || '0';
          return parseInt(String(v).replace(/\D/g, '')) || 0;
        }
        case 'valore': {
          const v = player.attributes?.Valore || player.attributes?.Val || '0';
          return parseInt(String(v).replace(/\D/g, '')) || 0;
        }
        default: return '';
      }
    };

    const sortedList = [...visibleList].sort((a, b) => {
      const valA = getSortValue(a, sortField);
      const valB = getSortValue(b, sortField);
      
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#0f0c1b', height: '100%', overflow: 'hidden' }}>
        <div style={{ height: '75px', padding: '0 24px', borderBottom: '2px solid #231b3a', display: 'flex', alignItems: 'center', backgroundColor: '#161224', justifyContent: 'space-between', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>
          <div style={{ display: 'flex', gap: '8px', backgroundColor: '#090710', padding: '6px', border: '1px solid #231b3a', borderRadius: '6px' }}>
            <button onClick={() => setDbSubTab('first_team')} style={{ padding: '8px 16px', border: 'none', cursor: 'pointer', textTransform: 'uppercase', fontSize: '13px', fontWeight: 'bold', backgroundColor: dbSubTab === 'first_team' ? '#da1b60' : 'transparent', color: '#fff', borderRadius: '4px' }}>Prima Squadra ({firstTeamPlayers.length})</button>
            <button onClick={() => setDbSubTab('youth')} style={{ padding: '8px 16px', border: 'none', cursor: 'pointer', textTransform: 'uppercase', fontSize: '13px', fontWeight: 'bold', backgroundColor: dbSubTab === 'youth' ? '#ffaa00' : 'transparent', color: '#fff', borderRadius: '4px' }}>Under 20 ({youthPlayers.length})</button>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUploadOCR} style={{ display: 'none' }} />
            <button onClick={() => fileInputRef.current.click()} disabled={isUploading} style={{ backgroundColor: '#da1b60', color: '#fff', border: 'none', padding: '10px 20px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer', borderRadius: '6px' }}>Carica Foto Rosa</button>
            {players.length > 0 && <button onClick={handleClearAllData} style={{ backgroundColor: 'transparent', border: '2px solid #ef4444', color: '#ef4444', padding: '10px 16px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer', borderRadius: '6px' }}>Azzera Sede</button>}
          </div>
        </div>

        <div style={{ flex: 1, padding: '24px', overflowY: 'auto', backgroundColor: '#090710' }}>
          {visibleList.length === 0 ? <div style={{ textAlign: 'center', padding: '64px', color: '#64748b', fontSize: '16px', fontWeight: 'bold', textTransform: 'uppercase', border: '2px dashed #231b3a', backgroundColor: '#140f24', borderRadius: '8px' }}>Nessun calciatore scansionato per il club {clubName.toUpperCase()}. Carica uno screenshot della rosa.</div> : (
            <div style={{ backgroundColor: '#140f24', border: '2px solid #231b3a', borderRadius: '8px', overflowX: 'auto', boxShadow: '0 15px 30px rgba(0,0,0,0.5)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#1d1733', borderBottom: '3px solid #090710' }}>
                    <th onClick={() => handleSort('name')} style={{ padding: '16px 14px', color: '#ffffff', fontSize: '13px', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none', borderRight: '1px solid #231b3a', fontWeight: '900' }}>
                      Nome {sortField === 'name' ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ''}
                    </th>
                    <th onClick={() => handleSort('position')} style={{ padding: '16px 14px', color: '#ffffff', fontSize: '13px', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none', borderRight: '1px solid #231b3a', fontWeight: '900' }}>
                      Ruolo {sortField === 'position' ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ''}
                    </th>
                    <th onClick={() => handleSort('age')} style={{ padding: '16px 14px', color: '#ffffff', fontSize: '13px', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none', textAlign: 'center', borderRight: '1px solid #231b3a', fontWeight: '900' }}>
                      Età {sortField === 'age' ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ''}
                    </th>
                    <th onClick={() => handleSort('pres')} style={{ padding: '16px 14px', color: '#ffffff', fontSize: '13px', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none', textAlign: 'center', borderRight: '1px solid #231b3a', fontWeight: '900' }}>
                      Pres {sortField === 'pres' ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ''}
                    </th>
                    <th onClick={() => handleSort('gol')} style={{ padding: '16px 14px', color: '#ffffff', fontSize: '13px', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none', textAlign: 'center', borderRight: '1px solid #231b3a', fontWeight: '900' }}>
                      Gol {sortField === 'gol' ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ''}
                    </th>
                    <th onClick={() => handleSort('mv')} style={{ padding: '16px 14px', color: '#ffffff', fontSize: '13px', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none', textAlign: 'center', borderRight: '1px solid #231b3a', fontWeight: '900' }}>
                      M.V. {sortField === 'mv' ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ''}
                    </th>
                    <th onClick={() => handleSort('ingaggio')} style={{ padding: '16px 14px', color: '#ffffff', fontSize: '13px', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none', textAlign: 'center', borderRight: '1px solid #231b3a', fontWeight: '900' }}>
                      Ingaggio {sortField === 'ingaggio' ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ''}
                    </th>
                    <th onClick={() => handleSort('valore')} style={{ padding: '16px 14px', color: '#ffffff', fontSize: '13px', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none', textAlign: 'right', fontWeight: '900' }}>
                      Valore {sortField === 'valore' ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ''}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedList.map((p, idx) => {
                    const wStr = p.attributes?.Ingaggio || p.attributes?.Stip || '0'; const wNum = parseInt(wStr.replace(/\D/g, '')) || 0;
                    const mv = parseFloat(String(p.attributes?.['Media Voto'] || p.attributes?.Mv).replace(',', '.')) || 0;
                    const gol = parseInt(p.attributes?.Gol || p.attributes?.Gls) || 0; const pres = parseInt(p.attributes?.Presenze || p.attributes?.Pres) || 0;
                    const isTopPlayer = (mv >= 7.10 && pres > 2) || gol >= 5; const isToxicContract = wNum > 1200 && (mv < 6.50 && pres > 3);
                    return (
                      <tr key={idx} onClick={() => setSelectedProfile(p)} style={{ borderBottom: '1px solid #231b3a', cursor: 'pointer', backgroundColor: selectedProfile?.name === p.name ? '#271e44' : 'transparent', transition: 'background 0.2s' }}>
                        <td style={{ padding: '16px 14px', fontWeight: 'bold', color: '#ffffff', fontSize: '15px' }}>
                          {p.name} 
                          {isTopPlayer && <span style={{ marginLeft: '8px', fontSize: '10px', backgroundColor: '#34d399', color: '#0f0c1b', padding: '3px 8px', borderRadius: '4px', fontWeight: '900' }}>TOP</span>} 
                          {isToxicContract && <span style={{ marginLeft: '8px', fontSize: '10px', backgroundColor: '#ef4444', color: '#ffffff', padding: '3px 8px', borderRadius: '4px', fontWeight: '900' }}>TOSSICO</span>}
                        </td>
                        <td style={{ padding: '16px 14px', color: '#22d3ee', fontWeight: '700', fontSize: '14px' }}>{p.position || 'N/D'}</td>
                        <td style={{ padding: '16px 14px', textAlign: 'center', color: '#f8fafc', fontWeight: 'bold', fontSize: '14px' }}>{p.age || '-'}</td>
                        <td style={{ padding: '16px 14px', textAlign: 'center', color: '#cbd5e1', fontFamily: 'monospace', fontSize: '14px' }}>{p.attributes?.Presenze || p.attributes?.Pres || '-'}</td>
                        <td style={{ padding: '16px 14px', textAlign: 'center', color: '#ffffff', fontWeight: 'bold', fontFamily: 'monospace', fontSize: '15px' }}>{p.attributes?.Gol || p.attributes?.Gls || '-'}</td>
                        <td style={{ padding: '16px 14px', textAlign: 'center', color: '#34d399', fontWeight: 'bold', fontFamily: 'monospace', fontSize: '15px' }}>{p.attributes?.['Media Voto'] || p.attributes?.Mv || '-'}</td>
                        <td style={{ padding: '16px 14px', textAlign: 'center', color: '#e2e8f0', fontFamily: 'monospace', fontSize: '14px' }}>{p.attributes?.Ingaggio || p.attributes?.Stip || '-'}</td>
                        <td style={{ padding: '16px 14px', textAlign: 'right', color: '#e2e8f0', fontFamily: 'monospace', fontSize: '14px', fontWeight: '700' }}>{p.attributes?.Valore || p.attributes?.Val || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#090710', color: '#cbd5e1', fontFamily: 'system-ui, -apple-system, sans-serif', overflow: 'hidden' }}>
      
      {/* SIDEBAR NAVIGATION COMPLETA AD 8 REPARTI CHIAVE */}
      <div style={{ width: '90px', backgroundColor: '#140f24', borderRight: '2px solid #231b3a', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '20px', gap: '16px', zIndex: 10, boxShadow: '4px 0 15px rgba(0,0,0,0.5)' }}>
        <div style={{ width: '52px', height: '52px', backgroundColor: '#da1b60', display: 'flex', alignItems: 'center', color: '#fff', fontWeight: '900', fontSize: '22px', borderRadius: '10px', justifyContent: 'center' }}>FM</div>
        
        <button onClick={() => setActiveRoom('board')} title="Tavolo Plenaria" style={{ background: activeRoom === 'board' ? '#271e44' : 'none', border: activeRoom === 'board' ? '2px solid #a855f7' : '2px solid transparent', color: activeRoom === 'board' ? '#a855f7' : '#475569', padding: '12px', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s' }}><Users size={24} /></button>
        <button onClick={() => setActiveRoom('vice')} title="Ufficio Vice Allenatore" style={{ background: activeRoom === 'vice' ? '#271e44' : 'none', border: activeRoom === 'vice' ? '2px solid #22d3ee' : '2px solid transparent', color: activeRoom === 'vice' ? '#22d3ee' : '#475569', padding: '12px', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s' }}><Sliders size={24} /></button>
        <button onClick={() => setActiveRoom('scout')} title="Ufficio Capo Osservatore" style={{ background: activeRoom === 'scout' ? '#271e44' : 'none', border: activeRoom === 'scout' ? '2px solid #f43f5e' : '2px solid transparent', color: activeRoom === 'scout' ? '#f43f5e' : '#475569', padding: '12px', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s' }}><Search size={24} /></button>
        <button onClick={() => setActiveRoom('ds')} title="Ufficio Direttore Sportivo" style={{ background: activeRoom === 'ds' ? '#271e44' : 'none', border: activeRoom === 'ds' ? '2px solid #fbbf24' : '2px solid transparent', color: activeRoom === 'ds' ? '#fbbf24' : '#475569', padding: '12px', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s' }}><Briefcase size={24} /></button>
        <button onClick={() => setActiveRoom('cfo')} title="Ufficio CFO Finanze" style={{ background: activeRoom === 'cfo' ? '#271e44' : 'none', border: activeRoom === 'cfo' ? '2px solid #10b981' : '2px solid transparent', color: activeRoom === 'cfo' ? '#10b981' : '#475569', padding: '12px', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s' }}><TrendingUp size={24} /></button>
        <button onClick={() => setActiveRoom('press')} title="Ufficio Stampa Conferenze" style={{ background: activeRoom === 'press' ? '#271e44' : 'none', border: activeRoom === 'press' ? '2px solid #ec4899' : '2px solid transparent', color: activeRoom === 'press' ? '#ec4899' : '#475569', padding: '12px', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s' }}><HelpCircle size={24} /></button>
        <button onClick={() => setActiveRoom('youth')} title="Ufficio Responsabile Giovanili" style={{ background: activeRoom === 'youth' ? '#271e44' : 'none', border: activeRoom === 'youth' ? '2px solid #ffaa00' : '2px solid transparent', color: activeRoom === 'youth' ? '#ffaa00' : '#475569', padding: '12px', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s' }}><Award size={24} /></button>
        <button onClick={() => setActiveRoom('analyst')} title="Ufficio Match Analyst Center" style={{ background: activeRoom === 'analyst' ? '#271e44' : 'none', border: activeRoom === 'analyst' ? '2px solid #3b82f6' : '2px solid transparent', color: activeRoom === 'analyst' ? '#3b82f6' : '#475569', padding: '12px', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s' }}><Activity size={24} /></button>
        
        <div style={{ width: '44px', height: '2px', backgroundColor: '#231b3a', margin: '6px 0' }}></div>
        <button onClick={() => setActiveRoom('database')} title="Plancia Organico Database" style={{ background: activeRoom === 'database' ? '#271e44' : 'none', border: activeRoom === 'database' ? '2px solid #da1b60' : '2px solid transparent', color: activeRoom === 'database' ? '#da1b60' : '#475569', padding: '12px', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s' }}><Database size={24} /></button>
      </div>

      {/* RENDERIZZAZIONE CONTESTUALE STANZE SULLO SCHERMO */}
      {activeRoom !== 'database' && renderChatWindow()}
      {activeRoom === 'database' && renderMasterDatabase()}

      {/* FLYOUT COMPATTO ED ENORME AD ALTA LEGGIBILITÀ PER I ATTRIBUTI FILTRATI */}
      {selectedProfile && (
        <div style={{ position: 'fixed', right: '25px', bottom: '25px', width: '340px', backgroundColor: '#140f24', border: '3px solid #da1b60', padding: '20px', borderRadius: '12px', boxShadow: '0 30px 60px rgba(0,0,0,0.9)', zIndex: 100 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #231b3a', paddingBottom: '12px', marginBottom: '16px', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '11px', color: '#da1b60', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px' }}>SCHEDA ATTRIBUTI INTUITIVA</span>
              <h4 style={{ fontSize: '20px', color: '#ffffff', margin: '4px 0 0 0', fontWeight: '900' }}>{selectedProfile.name}</h4>
            </div>
            <button onClick={() => setSelectedProfile(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '6px' }}><X size={22} /></button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '380px', overflowY: 'auto', paddingRight: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', padding: '10px 14px', backgroundColor: '#090710', border: '1px solid #231b3a', borderRadius: '6px' }}>
              <span style={{ color: '#94a3b8', fontWeight: '500' }}>Ruolo Estratto</span>
              <span style={{ color: '#22d3ee', fontWeight: '900', textTransform: 'uppercase' }}>{selectedProfile.position || 'N/D'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', padding: '10px 14px', backgroundColor: '#090710', border: '1px solid #231b3a', borderRadius: '6px' }}>
              <span style={{ color: '#94a3b8', fontWeight: '500' }}>Età</span>
              <span style={{ color: '#ffffff', fontWeight: '900' }}>{selectedProfile.age || 'N/D'}</span>
            </div>
            {Object.entries(selectedProfile.attributes).map(([key, val]) => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', padding: '10px 14px', backgroundColor: '#090710', border: '1px solid #231b3a', borderRadius: '6px' }}>
                <span style={{ color: '#94a3b8', fontWeight: '500' }}>{key}</span>
                <span style={{ color: '#34d399', fontWeight: '900', fontFamily: 'monospace', fontSize: '16px' }}>{String(val)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}

export default App
