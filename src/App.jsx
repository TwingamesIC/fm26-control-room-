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
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent([prompt, imagePart]);
      setScoutAnalysisResult(result.response.text());
    } catch (err) {
      setScoutAnalysisResult(`Errore osservatore: ${err.message}`);
    } finally {
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
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent([prompt, imagePart]);
      setPressAnalysisResult(result.response.text());
    } catch (err) {
      setPressAnalysisResult(`Errore addetto stampa: ${err.message}`);
    } finally {
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
      const prompt = `Sei il Match Analyst del club "${clubName}". Esamina questo screenshot di dati, tiri o xG di FM26. FASE 1: Estrai i dati di performance (Tiri, possesso, xG totali, errori di reparto). FASE 2: Fornisci istruzioni di squadra algoritmiche da cambiare subito nei pannelli di FM per correggere i blackout.`;
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent([prompt, imagePart]);
      setAnalystAnalysisResult(result.response.text());
    } catch (e) {
      setAnalystAnalysisResult("Errore di match analysis visiva.");
    } finally {
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
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
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
    } finally {
      setIsAnalyzingFinance(false);
    }
  }

  async function handleYouthImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    setIsAnalyzingYouth(true);
    setYouthAnalysisResult("Il Responsabile delle Giovanili sta tracciando lo sviluppo atletico...");
    try {
      const imagePart = await fileToGenerativePart(file);
      const prompt = `Sei il Responsabile Giovanili del club "${clubName}". Esamina questo screenshot profilo Under 20 di FM26. Detta i punti di forza, la personalità, il livello di determinazione e stila il ruolo e focus di allenamento perfetto per massimizzare la crescita nel Match Engine.`;
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent([prompt, imagePart]);
      setYouthAnalysisResult(result.response.text());
    } catch (e) {
      setYouthAnalysisResult("Errore lettura vivaio.");
    } finally {
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
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
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

  // CORE ENGINE CHAT: COERENZA AZIENDALE CONDIVISA TOTAL-TALK
  async function handleSendMessage() {
    if (!chatInput.trim()) return;
    const currentInputText = chatInput;
    setChatInput('');
    setIsTyping(true);

    const userMessageObj = { sender_role: 'user', content: currentInputText };
    const updatedMessages = [...messages, userMessageObj];
    setMessages(updatedMessages);

    try { await supabase.from('club_messages').insert([userMessageObj]); } catch(e) { setCloudStatus('offline') }

    try {
      const squadContext = players.map(p => ({ nome: p.name, ruolo: p.position, stats: p.attributes }));
      const businessChronology = updatedMessages.slice(-12).map(m => `${m.sender_role.toUpperCase()}: ${m.content}`).join('\n');

      let instructionPrompt = `
        SEI LO STAFF DIRIGENZIALE DEL CLUB "${clubName.toUpperCase()}" SU FOOTBALL MANAGER 2026.
        Il tuo Mister dice: "${currentInputText}"
        DISCORSI PRECEDENTI NELLE STANZE:
        ${businessChronology}
        STATO ATTUALE: Cassa €${finances.balance} | Budget Mercato €${finances.transfer_budget} | Ingaggi €${finances.wage_budget}/sett.
        ROSA REALE ESTRATTA: ${JSON.stringify(squadContext.slice(0, 35))}
      `;

      if (activeRoom === 'board') {
        instructionPrompt += `
          REGOLE TAVOLO PLENARIA (IL TAVOLONE COMPLETO):
          Sei l'intero consiglio dello staff convocato in riunione segreta dal Mister. Devi generare tassativamente una risposta complessa in cui TUTTI E 7 i collaboratori prendono la parola uno dopo l'altro esprimendo la propria opinione dal loro specifico angolo di competenza.
          Sii un esperto cinico e leale del Match Engine. Rispetta fedelmente questo formato di testo ad ampio volume (fai parlare tutti e 7):
          
          VICE ALLENATORE: [Opinione di campo, assetto tattico, morale spogliatoio e reattività dei ragazzi in lista]
          DIRETTORE SPORTIVO: [Opinione commerciale su contratti della rosa, rinnovi strategici e mercato]
          CHIEF SCOUT: [Opinione tecnica sulla futuribilità ed inserimento di eventuali obiettivi esterni scansionati]
          CFO FINANZE: [Opinione contabile rigida su ammortamento a bilancio, tasse e sostenibilità delle casse]
          ADDETTO STAMPA: [Opinione su come reagiranno i media e l'opinione pubblica dei tifosi a questa scelta]
          RESPONSABILE GIOVANILI: [Opinione sull'inserimento e crescita dei nostri ragazzi Under 20 e sui wonderkids della squadra]
          MATCH ANALYST: [Opinione fredda basata sui numeri, xG, statistiche di gioco ed efficienza matematica]
        `;
      } else {
        instructionPrompt += `
          STANZA SINGOLA ATTIVA: INTERPRETA ESCLUSIVAMENTE IL RUOLO DI: '${activeRoom.toUpperCase()}'.
          Rispondi in modo esteso, cinico, fedelissimo ed iper-competente di calcio e di FM26:
          - 'vice': Focus totale su tattica, allenamento, ruoli e campo.
          - 'ds': Focus totale su rinnovi, acquisti, esuberi da tagliare e scadenze.
          - 'scout': Focus su obiettivi di mercato esterni e report osservatori.
          - 'cfo': Focus su bilancio puro, formule di ammortamento e conti societari.
          - 'press': Focus su gestione dei giornalisti e interpretazione della personalità mediatica "${personality.toUpperCase()}".
          - 'youth': Focus su valorizzazione dei giovani Under 20.
          - 'analyst': Focus su xG, tiri, baricentro e modifiche istruzioni di squadra sui pannelli di FM.
        `;
      }

      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(instructionPrompt);
      const aiMessageObj = { sender_role: activeRoom, content: result.response.text() };
      setMessages(prev => [...prev, aiMessageObj]);
      try { await supabase.from('club_messages').insert([aiMessageObj]); } catch(e) {}
    } catch (error) { console.error(error); } finally { setIsTyping(false); }
  }

  async function handleAnalyzeExternalTactic() {
    if (!externalTacticInput.trim()) return;
    setIsAnalyzingTactic(true); setTacticAnalysisResult("Incrocio flussi tattici avanzati...");
    try {
      const currentSquadContext = players.map(p => ({ nome: p.name, ruolo: p.position, stats: p.attributes }));
      const prompt = `Analizza questa tattica: """${externalTacticInput}""" sulla rosa ${clubName}: ${JSON.stringify(currentSquadContext.slice(0, 40))}. Dividi l'output in FASE 1 (70% analisi modulo nel Match Engine) e FASE 2 (30% screening nomi esatti promossi e bocciati da cedere).`;
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
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
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
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

  // ==========================================
  // FUNZIONI DI RENDERING INLINE PER BLINDARE IL FOCUS DI REPARTO
  // ==========================================
  function renderChatWindow() {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#0f0c1b', height: '100%' }}>
        <div style={{ height: '64px', padding: '0 20px', borderBottom: '1px solid #2c2347', display: 'flex', alignItems: 'center', backgroundColor: '#161224', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MessageSquare size={18} color="#da1b60" /> 
            <h2 style={{ fontSize: '14px', color: '#fff', margin: 0, textTransform: 'uppercase', fontWeight: 'bold' }}>Stanza: {activeRoom.toUpperCase()}</h2>
          </div>
          {cloudStatus === 'offline' && <div style={{ fontSize: '10px', backgroundColor: '#450a0a', color: '#fca5a5', padding: '4px 8px', border: '1px solid #991b1b', fontWeight: 'bold' }}>Offline Local Cache</div>}
        </div>

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', flexDirection: 'row' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', borderRight: '1px solid #2c2347' }}>
            <div ref={chatContainerRef} style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              {messages.map((msg, index) => {
                let align = 'flex-start'; let bColor = '#2c2347'; let nameLabel = 'STAFF'; let itemBg = '#161224';
                if (msg.sender_role === 'user') { align = 'flex-end'; bColor = '#da1b60'; nameLabel = 'MISTER'; itemBg = '#221b36'; }
                else if (msg.sender_role === 'vice') { bColor = '#22d3ee'; nameLabel = 'VICE ALLENATORE'; }
                else if (msg.sender_role === 'ds') { bColor = '#fbbf24'; nameLabel = 'DIRETTORE SPORTIVO'; }
                else if (msg.sender_role === 'scout') { bColor = '#f43f5e'; nameLabel = 'CAPO OSSERVATORE'; }
                else if (msg.sender_role === 'cfo') { bColor = '#10b981'; nameLabel = 'CFO FINANZE'; }
                else if (msg.sender_role === 'press') { bColor = '#ec4899'; nameLabel = 'UFFICIO STAMPA'; }
                else if (msg.sender_role === 'youth') { bColor = '#ffaa00'; nameLabel = 'RESPONSABILE GIOVANILI'; }
                else if (msg.sender_role === 'analyst') { bColor = '#3b82f6'; nameLabel = 'MATCH ANALYST'; }
                else if (msg.sender_role === 'board') { bColor = '#a855f7'; nameLabel = 'RIUNIONE PLENARIA'; }

                return (
                  <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: align, width: '100%', marginBottom: '16px' }}>
                    <span style={{ fontSize: '9px', color: '#475569', fontWeight: 'bold', marginBottom: '4px', textTransform: 'uppercase' }}>{nameLabel}</span>
                    <div style={{ padding: '12px', fontSize: '13px', backgroundColor: itemBg, color: '#fff', borderLeft: `3px solid ${bColor}`, borderRadius: '4px', maxWidth: '85%', lineHeight: '1.5', whiteSpace: 'pre-line' }}>{msg.content}</div>
                  </div>
                );
              })}
              {isTyping && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <span style={{ fontSize: '9px', color: '#475569', fontWeight: 'bold', marginBottom: '4px' }}>TAVOLO DI SEDE</span>
                  <div style={{ padding: '12px', fontSize: '13px', backgroundColor: '#161224', color: '#64748b', borderLeft: '3px solid #475569', borderRadius: '4px', fontStyle: 'italic' }}>I membri dello staff stanno scrivendo a verbale...</div>
                </div>
              )}
            </div>

            <div style={{ padding: '16px', backgroundColor: '#161224', borderTop: '1px solid #2c2347' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <ChevronRight style={{ position: 'absolute', left: '10px', color: '#da1b60' }} size={16} />
                <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="Impartisci una direttiva allo staff..." style={{ width: '100%', backgroundColor: '#0f0c1b', border: '1px solid #2c2347', padding: '10px 40px 10px 32px', fontSize: '13px', color: '#fff', borderRadius: '4px', outline: 'none' }} />
                <button onClick={handleSendMessage} disabled={isTyping} style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', color: '#da1b60', cursor: 'pointer' }}><Send size={14} /></button>
              </div>
            </div>
          </div>

          <div style={{ width: '360px', backgroundColor: '#120e1f', padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {activeRoom === 'board' && (
              <>
                <h3 style={{ fontSize: '11px', textTransform: 'uppercase', color: '#a855f7', borderBottom: '1px solid #2c2347', paddingBottom: '6px', margin: 0, fontWeight: 'bold' }}>Stato Societario Plenaria</h3>
                <div style={{ backgroundColor: '#161224', border: '1px solid #2c2347', padding: '12px', borderRadius: '4px' }}>
                  <label style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Club Attuale in FM</label>
                  <input type="text" value={clubName} onChange={(e) => setClubName(e.target.value)} style={{ width: '90%', backgroundColor: '#0f0c1b', border: '1px solid #2c2347', padding: '6px', color: '#fff', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '12px' }} />
                </div>
                <div style={{ backgroundColor: '#161224', border: '1px solid #2c2347', padding: '12px', borderRadius: '4px', fontSize: '12px', lineHeight: '1.4' }}>
                  <span style={{ color: '#94a3b8', display: 'block', marginBottom: '4px' }}>📊 Indicatori:</span>
                  • Giocatori: <strong>{players.length}</strong><br />
                  • Cassa: <strong>€{finances.balance.toLocaleString()}</strong><br />
                  • Budget: <strong>€{finances.transfer_budget.toLocaleString()}</strong>
                </div>
              </>
            )}

            {activeRoom === 'vice' && (
              <>
                <h3 style={{ fontSize: '11px', textTransform: 'uppercase', color: '#22d3ee', borderBottom: '1px solid #2c2347', paddingBottom: '6px', margin: 0, fontWeight: 'bold' }}>Laboratorio Tattico</h3>
                <textarea value={externalTacticInput} onChange={(e) => setExternalTacticInput(e.target.value)} placeholder="Incolla l'analisi di una tattica esterna..." style={{ width: '93%', height: '120px', backgroundColor: '#0f0c1b', border: '1px solid #2c2347', padding: '8px', color: '#fff', fontSize: '12px', resize: 'none' }} />
                <button onClick={handleAnalyzeExternalTactic} disabled={isAnalyzingTactic} style={{ backgroundColor: '#22d3ee', color: '#0f0c1b', border: 'none', padding: '8px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', borderRadius: '4px', cursor: 'pointer', width: '100%' }}>Avvia Convalida Modulo</button>
                {tacticAnalysisResult && <div style={{ backgroundColor: '#0f0c1b', border: '1px solid #2c2347', padding: '10px', fontSize: '11px', whiteSpace: 'pre-line', color: '#cbd5e1' }}>{tacticAnalysisResult}</div>}
              </>
            )}

            {activeRoom === 'scout' && (
              <>
                <h3 style={{ fontSize: '11px', textTransform: 'uppercase', color: '#f43f5e', borderBottom: '1px solid #2c2347', paddingBottom: '6px', margin: 0, fontWeight: 'bold' }}>Osservatorio Acquisti</h3>
                <input type="file" accept="image/*" ref={scoutInputRef} onChange={handleScoutImageUpload} style={{ display: 'none' }} />
                <button onClick={() => scoutInputRef.current.click()} disabled={isAnalyzingScout} style={{ width: '100%', backgroundColor: '#f43f5e', color: '#fff', border: 'none', padding: '10px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', borderRadius: '4px', cursor: 'pointer' }}>Carica Profilo Obiettivo</button>
                {scoutAnalysisResult && <div style={{ backgroundColor: '#0f0c1b', border: '1px solid #2c2347', padding: '10px', fontSize: '11px', whiteSpace: 'pre-line', color: '#cbd5e1' }}>{scoutAnalysisResult}</div>}
              </>
            )}

            {activeRoom === 'ds' && (
              <>
                <h3 style={{ fontSize: '11px', textTransform: 'uppercase', color: '#fbbf24', borderBottom: '1px solid #2c2347', paddingBottom: '6px', margin: 0, fontWeight: 'bold' }}>Alert Contratti</h3>
                <div style={{ backgroundColor: '#161224', border: '1px solid #2c2347', padding: '12px', borderRadius: '4px', fontSize: '11px', lineHeight: '1.4' }}>
                  <span style={{ color: '#fbbf24', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>⚠️ STRUTTURA SALARIALE:</span>
                  I giocatori contrassegnati come <strong style={{ color: '#ef4444' }}>TOSSICO</strong> bloccato il Sora. Taglia o vendi subito.
                </div>
              </>
            )}

            {activeRoom === 'press' && (
              <>
                <h3 style={{ fontSize: '11px', textTransform: 'uppercase', color: '#ec4899', borderBottom: '1px solid #2c2347', paddingBottom: '6px', margin: 0, fontWeight: 'bold' }}>Media Strategic Hub</h3>
                <div style={{ backgroundColor: '#161224', border: '1px solid #2c2347', padding: '12px', borderRadius: '4px', marginBottom: '10px' }}>
                  <label style={{ fontSize: '10px', color: '#cbd5e1', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>🎭 Personalità Allenatore:</label>
                  <select value={personality} onChange={(e) => updateCoachPersonality(e.target.value)} style={{ width: '100%', backgroundColor: '#0f0c1b', border: '1px solid #2c2347', padding: '6px', color: '#fff', fontSize: '12px', cursor: 'pointer' }}>
                    <option value="professional">💼 Professional (Diplomatico)</option>
                    <option value="aggressive">🔥 Aggressive (Mourinhiano)</option>
                    <option value="passionate">❤️ Passionate (Passionale / Viscerale)</option>
                    <option value="calculated">📊 Calculated (Pragmatico / xG)</option>
                  </select>
                </div>
                <input type="file" accept="image/*" ref={pressInputRef} onChange={handlePressImageUpload} style={{ display: 'none' }} />
                <button onClick={() => pressInputRef.current.click()} disabled={isAnalyzingPress} style={{ width: '100%', backgroundColor: '#ec4899', color: '#fff', border: 'none', padding: '10px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>Carica Conferenza FM</button>
                {pressAnalysisResult && <div style={{ backgroundColor: '#0f0c1b', border: '1px solid #2c2347', padding: '10px', fontSize: '11px', whiteSpace: 'pre-line', color: '#cbd5e1', maxHeight: '220px', overflowY: 'auto' }}>{pressAnalysisResult}</div>}
              </>
            )}

            {activeRoom === 'youth' && (
              <>
                <h3 style={{ fontSize: '11px', textTransform: 'uppercase', color: '#ffaa00', borderBottom: '1px solid #2c2347', paddingBottom: '6px', margin: 0, fontWeight: 'bold' }}>Vivaio Under 20</h3>
                <input type="file" accept="image/*" ref={youthInputRef} onChange={handleYouthImageUpload} style={{ display: 'none' }} />
                <button onClick={() => youthInputRef.current.click()} disabled={isAnalyzingYouth} style={{ width: '100%', backgroundColor: '#ffaa00', color: '#0f0c1b', border: 'none', padding: '10px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>Carica Screen Wonderkid</button>
                {youthAnalysisResult && <div style={{ backgroundColor: '#0f0c1b', border: '1px solid #2c2347', padding: '10px', fontSize: '11px', whiteSpace: 'pre-line', color: '#cbd5e1' }}>{youthAnalysisResult}</div>}
              </>
            )}

            {activeRoom === 'analyst' && (
              <>
                <h3 style={{ fontSize: '11px', textTransform: 'uppercase', color: '#3b82f6', borderBottom: '1px solid #2c2347', paddingBottom: '6px', margin: 0, fontWeight: 'bold' }}>Match Analysis Center</h3>
                <input type="file" accept="image/*" ref={analystInputRef} onChange={handleAnalystImageUpload} style={{ display: 'none' }} />
                <button onClick={() => analystInputRef.current.click()} disabled={isAnalyzingAnalyst} style={{ width: '100%', backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '10px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>Carica Tabellino Gara</button>
                {analystAnalysisResult && <div style={{ backgroundColor: '#0f0c1b', border: '1px solid #2c2347', padding: '10px', fontSize: '11px', whiteSpace: 'pre-line', color: '#cbd5e1' }}>{analystAnalysisResult}</div>}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderFinanceInterface() {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#0f0c1b', height: '100%' }}>
        <div style={{ height: '64px', padding: '0 24px', borderBottom: '1px solid #2c2347', display: 'flex', alignItems: 'center', backgroundColor: '#161224', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><TrendingUp color="#10b981" /> <h2 style={{ fontSize: '14px', color: '#fff', margin: 0, textTransform: 'uppercase', fontWeight: 'bold' }}>Ufficio CFO & Finanze {clubName.toUpperCase()}</h2></div>
        </div>

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', flexDirection: 'row' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', borderRight: '1px solid #2c2347' }}>
            <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
              {messages.filter(m => m.sender_role === 'cfo' || m.sender_role === 'user' || m.sender_role === 'system').slice(-10).map((msg, index) => (
                <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.sender_role === 'user' ? 'flex-end' : 'flex-start', marginBottom: '16px' }}>
                  <span style={{ fontSize: '9px', color: '#475569', fontWeight: 'bold', marginBottom: '4px' }}>{msg.sender_role === 'user' ? 'MISTER' : 'CFO FINANZE'}</span>
                  <div style={{ padding: '12px', fontSize: '13px', backgroundColor: msg.sender_role === 'user' ? '#221b36' : '#161224', color: '#fff', borderLeft: msg.sender_role === 'user' ? '3px solid #da1b60' : '3px solid #10b981', borderRadius: '4px', maxWidth: '85%', lineHeight: '1.4' }}>{msg.content}</div>
                </div>
              ))}
            </div>
            <div style={{ padding: '16px', backgroundColor: '#161224', borderTop: '1px solid #2c2347' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <ChevronRight style={{ position: 'absolute', left: '10px', color: '#10b981' }} size={16} />
                <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="Parla di bilanci o di investimenti Moneyball con il CFO..." style={{ width: '100%', backgroundColor: '#0f0c1b', border: '1px solid #2c2347', padding: '10px 40px 10px 32px', fontSize: '13px', color: '#fff', borderRadius: '4px', outline: 'none' }} />
                <button onClick={handleSendMessage} style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', color: '#10b981', cursor: 'pointer' }}><Send size={14} /></button>
              </div>
            </div>
          </div>

          <div style={{ width: '380px', backgroundColor: '#120e1f', padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '11px', textTransform: 'uppercase', color: '#10b981', borderBottom: '1px solid #2c2347', paddingBottom: '6px', margin: 0, fontWeight: 'bold' }}>Cassaforte & Sviluppo Bilanci</h3>
            
            <div style={{ backgroundColor: '#161224', border: '1px solid #2c2347', padding: '12px', borderRadius: '4px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 'bold', textTransform: 'uppercase' }}>📊 Bilancio visivo OCR:</span>
              <input type="file" accept="image/*" ref={financeInputRef} onChange={handleFinanceImageUpload} style={{ display: 'none' }} />
              <button onClick={() => financeInputRef.current.click()} disabled={isAnalyzingFinance} style={{ width: '100%', backgroundColor: '#10b981', color: '#0f0c1b', border: 'none', padding: '10px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer' }}>Carica Screen Finanze</button>
              {financeAnalysisResult && <div style={{ backgroundColor: '#0f0c1b', border: '1px solid #2c2347', padding: '10px', fontSize: '11px', color: '#cbd5e1', maxHeight: '180px', overflowY: 'auto' }}>{financeAnalysisResult}</div>}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div><label style={{ fontSize: '10px', color: '#94a3b8' }}>Bilancio (€)</label><input type="number" value={finances.balance} onChange={(e) => updateFinancesCloud('balance', e.target.value)} style={{ width: '90%', backgroundColor: '#0f0c1b', border: '1px solid #2c2347', padding: '8px', color: '#10b981', fontWeight: 'bold' }} /></div>
              <div><label style={{ fontSize: '10px', color: '#94a3b8' }}>Budget Trasferimenti (€)</label><input type="number" value={finances.transfer_budget} onChange={(e) => updateFinancesCloud('transfer_budget', e.target.value)} style={{ width: '90%', backgroundColor: '#0f0c1b', border: '1px solid #2c2347', padding: '8px', color: '#fff' }} /></div>
              <div><label style={{ fontSize: '10px', color: '#94a3b8' }}>Monte Ingaggi Settimanale (€/sett)</label><input type="number" value={finances.wage_budget} onChange={(e) => updateFinancesCloud('wage_budget', e.target.value)} style={{ width: '90%', backgroundColor: '#0f0c1b', border: '1px solid #2c2347', padding: '8px', color: '#fff' }} /></div>
            </div>

            <div style={{ backgroundColor: '#161224', border: '1px solid #2c2347', padding: '16px', borderRadius: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#fff', textTransform: 'uppercase' }}>📊 Simulatore Moneyball</span>
              <div style={{ marginTop: '8px' }}><label style={{ fontSize: '9px', color: '#64748b' }}>Costo Cartellino (€)</label><input type="number" value={simCost} onChange={(e) => setSimCost(e.target.value)} style={{ width: '90%', backgroundColor: '#0f0f1c', border: '1px solid #2c2347', padding: '6px', color: '#fff', fontSize: '12px' }} /></div>
              <div style={{ marginTop: '8px' }}><label style={{ fontSize: '9px', color: '#64748b' }}>Ingaggio (€/sett)</label><input type="number" value={simWage} onChange={(e) => setSimWage(e.target.value)} style={{ width: '90%', backgroundColor: '#0f0f1c', border: '1px solid #2c2347', padding: '6px', color: '#fff', fontSize: '12px' }} /></div>
              <div style={{ marginTop: '8px' }}><label style={{ fontSize: '9px', color: '#64748b' }}>Anni Contratto</label><input type="number" value={simYears} onChange={(e) => setSimYears(e.target.value)} style={{ width: '90%', backgroundColor: '#0f0f1c', border: '1px solid #2c2347', padding: '6px', color: '#fff', fontSize: '12px' }} /></div>
              <button onClick={handleSimulateTransfer} style={{ backgroundColor: '#10b981', color: '#0f0c1b', border: 'none', padding: '8px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer', borderRadius: '4px', marginTop: '12px' }}>Calcola Ammortamento</button>
              {simResult && (
                <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#0f0c1b', borderLeft: `3px solid ${simResult.color}`, fontSize: '11px' }}>
                  <span style={{ color: simResult.color }}>DIRETTIVA: {simResult.status}</span><br/>
                  Ammortamento: <strong>€{simResult.annualAmortization.toLocaleString()}</strong><br/>
                  Costo Lordo: <strong>€{simResult.annualWageCost.toLocaleString()}</strong>
                  <p style={{ margin: '4px 0 0 0', color: '#94a3b8', lineHeight: '1.3' }}>{simResult.notes}</p>
                </div>
              )}
            </div>

            <button onClick={handleFinanceAudit} disabled={isAuditing} style={{ backgroundColor: '#da1b60', color: '#fff', border: 'none', padding: '10px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer', borderRadius: '4px', marginTop: '10px', width: '100%' }}>{isAuditing ? 'Elaborazione...' : 'Genera Audit Globale'}</button>
            {financeAudit && <div style={{ marginTop: '12px', backgroundColor: '#0f0c1b', border: '1px solid #2c2347', padding: '12px', fontSize: '11px', lineHeight: '1.5', whiteSpace: 'pre-line' }}>{financeAudit}</div>}
          </div>
        </div>
      </div>
    );
  }

  function renderMasterDatabase() {
    const firstTeamPlayers = players.filter(p => p.type === 'player' && (p.age >= 20 || !p.age));
    const youthPlayers = players.filter(p => p.type === 'player' && p.age && p.age < 20);
    const visibleList = dbSubTab === 'first_team' ? firstTeamPlayers : youthPlayers;

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#0f0c1b', height: '100%', overflow: 'hidden' }}>
        <div style={{ height: '64px', padding: '0 24px', borderBottom: '1px solid #2c2347', display: 'flex', alignItems: 'center', backgroundColor: '#161224', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '6px', backgroundColor: '#0f0c1b', padding: '4px', border: '1px solid #2c2347' }}>
            <button onClick={() => setDbSubTab('first_team')} style={{ padding: '6px 12px', border: 'none', cursor: 'pointer', textTransform: 'uppercase', fontSize: '11px', fontWeight: 'bold', backgroundColor: dbSubTab === 'first_team' ? '#da1b60' : 'transparent', color: '#fff' }}>Prima Squadra ({firstTeamPlayers.length})</button>
            <button onClick={() => setDbSubTab('youth')} style={{ padding: '6px 12px', border: 'none', cursor: 'pointer', textTransform: 'uppercase', fontSize: '11px', fontWeight: 'bold', backgroundColor: dbSubTab === 'youth' ? '#ffaa00' : 'transparent', color: '#fff' }}>Under 20 ({youthPlayers.length})</button>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUploadOCR} style={{ display: 'none' }} />
            <button onClick={() => fileInputRef.current.click()} disabled={isUploading} style={{ backgroundColor: '#da1b60', color: '#fff', border: 'none', padding: '8px 16px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer', borderRadius: '4px' }}>Carica Foto Rosa</button>
            {players.length > 0 && <button onClick={handleClearAllData} style={{ backgroundColor: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '8px 12px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer', borderRadius: '4px' }}>Azzera Sede</button>}
          </div>
        </div>

        <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          {visibleList.length === 0 ? <div style={{ textAlign: 'center', padding: '48px', color: '#64748b', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', border: '1px dashed #2c2347', backgroundColor: '#161224' }}>Nessun calciatore scansionato per il club {clubName.toUpperCase()}. Carica uno screenshot della rosa.</div> : (
            <div style={{ backgroundColor: '#161224', border: '1px solid #2c2347', borderRadius: '6px', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '750px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#1f1a3a', borderBottom: '2px solid #0f0c1b' }}>
                    <th style={{ padding: '12px', color: '#cbd5e1', fontSize: '11px', textTransform: 'uppercase' }}>Nome Calciatore</th><th style={{ padding: '12px', color: '#cbd5e1', fontSize: '11px', textTransform: 'uppercase' }}>Ruolo</th><th style={{ padding: '12px', color: '#cbd5e1', fontSize: '11px', textTransform: 'uppercase', textAlign: 'center' }}>Età</th><th style={{ padding: '12px', color: '#cbd5e1', fontSize: '11px', textTransform: 'uppercase', textAlign: 'center' }}>Pres</th><th style={{ padding: '12px', color: '#cbd5e1', fontSize: '11px', textTransform: 'uppercase', textAlign: 'center' }}>Gol</th><th style={{ padding: '12px', color: '#cbd5e1', fontSize: '11px', textTransform: 'uppercase', textAlign: 'center' }}>M.V.</th><th style={{ padding: '12px', color: '#cbd5e1', fontSize: '11px', textTransform: 'uppercase', textAlign: 'center' }}>Ingaggio</th><th style={{ padding: '12px', color: '#cbd5e1', fontSize: '11px', textTransform: 'uppercase', textAlign: 'right' }}>Valore</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleList.map((p, idx) => {
                    const wStr = p.attributes?.Ingaggio || p.attributes?.Stip || '0'; const wNum = parseInt(wStr.replace(/\D/g, '')) || 0;
                    const mv = parseFloat(String(p.attributes?.['Media Voto'] || p.attributes?.Mv).replace(',', '.')) || 0;
                    const gol = parseInt(p.attributes?.Gol || p.attributes?.Gls) || 0; const pres = parseInt(p.attributes?.Presenze || p.attributes?.Pres) || 0;
                    const isTopPlayer = (mv >= 7.10 && pres > 2) || gol >= 5; const isToxicContract = wNum > 1200 && (mv < 6.50 && pres > 3);
                    return (
                      <tr key={idx} onClick={() => setSelectedProfile(p)} style={{ borderBottom: '1px solid #0f0c1b', cursor: 'pointer', backgroundColor: selectedProfile?.name === p.name ? '#221b36' : 'transparent' }}>
                        <td style={{ padding: '12px', fontWeight: 'bold', color: '#f8fafc', borderRight: '1px solid rgba(15,12,27,0.1)' }}>{p.name} {isTopPlayer && <span style={{ marginLeft: '6px', fontSize: '9px', backgroundColor: '#34d399', color: '#0f0c1b', padding: '2px 5px', borderRadius: '3px', fontWeight: '900' }}>TOP</span>} {isToxicContract && <span style={{ marginLeft: '6px', fontSize: '9px', backgroundColor: '#ef4444', color: '#fff', padding: '2px 5px', borderRadius: '3px', fontWeight: '900' }}>TOSSICO</span>}</td>
                        <td style={{ padding: '12px', color: '#22d3ee', fontWeight: '600' }}>{p.position || 'N/D'}</td><td style={{ padding: '12px', textAlign: 'center', color: '#cbd5e1', fontWeight: 'bold' }}>{p.age || '-'}</td><td style={{ padding: '12px', textAlign: 'center', color: '#94a3b8', fontFamily: 'monospace' }}>{p.attributes?.Presenze || p.attributes?.Pres || '-'}</td><td style={{ padding: '12px', textAlign: 'center', color: '#fff', fontWeight: 'bold', fontFamily: 'monospace' }}>{p.attributes?.Gol || p.attributes?.Gls || '-'}</td><td style={{ padding: '12px', textAlign: 'center', color: '#34d399', fontWeight: 'bold', fontFamily: 'monospace' }}>{p.attributes?.['Media Voto'] || p.attributes?.Mv || '-'}</td><td style={{ padding: '12px', textAlign: 'center', color: '#cbd5e1', fontFamily: 'monospace' }}>{p.attributes?.Ingaggio || p.attributes?.Stip || '-'}</td><td style={{ padding: '12px', textAlign: 'right', color: '#cbd5e1', fontFamily: 'monospace' }}>{p.attributes?.Valore || p.attributes?.Val || '-'}</td>
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
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#0f0c1b', color: '#cbd5e1', fontFamily: 'system-ui, -apple-system, sans-serif', overflow: 'hidden' }}>
      
      {/* SIDEBAR NAVIGATION COMPLETA AD 8 COMPARACHI CHIAVE */}
      <div style={{ width: '80px', backgroundColor: '#161224', borderRight: '1px solid #2c2347', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '16px', gap: '14px', zIndex: 10 }}>
        <div style={{ width: '46px', height: '46px', backgroundColor: '#da1b60', display: 'flex', alignItems: 'center', justifyCenter: 'center', color: '#fff', fontWeight: '900', fontSize: '18px', borderRadius: '8px', justifyContent: 'center' }}>FM</div>
        
        <button onClick={() => setActiveRoom('board')} title="Tavolo Plenaria" style={{ background: activeRoom === 'board' ? '#221b36' : 'none', border: activeRoom === 'board' ? '1px solid #a855f7' : '1px solid transparent', color: activeRoom === 'board' ? '#a855f7' : '#475569', padding: '10px', borderRadius: '8px', cursor: 'pointer' }}><Users size={22} /></button>
        <button onClick={() => setActiveRoom('vice')} title="Ufficio Vice Allenatore" style={{ background: activeRoom === 'vice' ? '#221b36' : 'none', border: activeRoom === 'vice' ? '1px solid #22d3ee' : '1px solid transparent', color: activeRoom === 'vice' ? '#22d3ee' : '#475569', padding: '10px', borderRadius: '8px', cursor: 'pointer' }}><Sliders size={22} /></button>
        <button onClick={() => setActiveRoom('scout')} title="Ufficio Capo Osservatore" style={{ background: activeRoom === 'scout' ? '#221b36' : 'none', border: activeRoom === 'scout' ? '1px solid #f43f5e' : '1px solid transparent', color: activeRoom === 'scout' ? '#f43f5e' : '#475569', padding: '10px', borderRadius: '8px', cursor: 'pointer' }}><Search size={22} /></button>
        <button onClick={() => setActiveRoom('ds')} title="Ufficio Direttore Sportivo" style={{ background: activeRoom === 'ds' ? '#221b36' : 'none', border: activeRoom === 'ds' ? '1px solid #fbbf24' : '1px solid transparent', color: activeRoom === 'ds' ? '#fbbf24' : '#475569', padding: '10px', borderRadius: '8px', cursor: 'pointer' }}><Briefcase size={22} /></button>
        <button onClick={() => setActiveRoom('cfo')} title="Ufficio CFO Finanze" style={{ background: activeRoom === 'cfo' ? '#221b36' : 'none', border: activeRoom === 'cfo' ? '1px solid #10b981' : '1px solid transparent', color: activeRoom === 'cfo' ? '#10b981' : '#475569', padding: '10px', borderRadius: '8px', cursor: 'pointer' }}><TrendingUp size={22} /></button>
        <button onClick={() => setActiveRoom('press')} title="Ufficio Stampa Conferenze" style={{ background: activeRoom === 'press' ? '#221b36' : 'none', border: activeRoom === 'press' ? '1px solid #ec4899' : '1px solid transparent', color: activeRoom === 'press' ? '#ec4899' : '#475569', padding: '10px', borderRadius: '8px', cursor: 'pointer' }}><HelpCircle size={22} /></button>
        <button onClick={() => setActiveRoom('youth')} title="Ufficio Responsabile Giovanili" style={{ background: activeRoom === 'youth' ? '#221b36' : 'none', border: activeRoom === 'youth' ? '1px solid #ffaa00' : '1px solid transparent', color: activeRoom === 'youth' ? '#ffaa00' : '#475569', padding: '10px', borderRadius: '8px', cursor: 'pointer' }}><Award size={22} /></button>
        <button onClick={() => setActiveRoom('analyst')} title="Ufficio Match Analyst Center" style={{ background: activeRoom === 'analyst' ? '#221b36' : 'none', border: activeRoom === 'analyst' ? '1px solid #3b82f6' : '1px solid transparent', color: activeRoom === 'analyst' ? '#3b82f6' : '#475569', padding: '10px', borderRadius: '8px', cursor: 'pointer' }}><Activity size={22} /></button>
        
        <div style={{ width: '36px', height: '1px', backgroundColor: '#2c2347', margin: '4px 0' }}></div>
        <button onClick={() => setActiveRoom('database')} title="Plancia Organico Database" style={{ background: activeRoom === 'database' ? '#221b36' : 'none', border: activeRoom === 'database' ? '1px solid #da1b60' : '1px solid transparent', color: activeRoom === 'database' ? '#da1b60' : '#475569', padding: '10px', borderRadius: '8px', cursor: 'pointer' }}><Database size={22} /></button>
      </div>

      {/* VALUTAZIONE IN LINEA PER BLOCCARE LA DISTRUZIONE E RICREAZIONE DEL DOM */}
      {activeRoom !== 'database' && activeRoom !== 'cfo' && renderChatWindow()}
      {activeRoom === 'cfo' && renderFinanceInterface()}
      {activeRoom === 'database' && renderMasterDatabase()}

      {/* FLYOUT SCHEDE ATTRIBUTO ESTESE */}
      {selectedProfile && (
        <div style={{ position: 'fixed', right: '20px', bottom: '20px', width: '280px', backgroundColor: '#161224', border: '1px solid #da1b60', padding: '16px', borderRadius: '8px', boxShadow: '0 25px 50px rgba(0,0,0,0.6)', zIndex: 100 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #2c2347', paddingBottom: '8px', marginBottom: '12px', alignItems: 'center' }}>
            <div><span style={{ fontSize: '9px', color: '#da1b60', fontWeight: 'bold' }}>Parametri Estratti</span><h4 style={{ fontSize: '14px', color: '#fff', margin: '2px 0 0 0' }}>{selectedProfile.name}</h4></div>
            <button onClick={() => setSelectedProfile(null)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer' }}><X size={14} /></button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {Object.entries(selectedProfile.attributes).map(([key, val]) => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '6px 10px', backgroundColor: '#0f0c1b', border: '1px solid #2c2347', borderRadius: '4px' }}><span style={{ color: '#94a3b8' }}>{key}</span><span style={{ color: '#34d399', fontWeight: 'bold', fontFamily: 'monospace' }}>{String(val)}</span></div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}

export default App