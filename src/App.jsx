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

  // DETECTOR DINAMICO DELLO SCREEN PER ADATTAMENTO SMARTPHONE LIVE
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  
  // STATO PER EVITARE IL SPLIT A METÀ SU SMARTPHONE: 'chat' OCCUPA TUTTO LO SCHERMO, 'tools' OCCUPA TUTTO LO SCHERMO
  const [mobileViewTab, setMobileViewTab] = useState('chat')

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
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

  // ==========================================
  // STRUMENTI PARSE CON AUTO-TOGGLE DI VISUALIZZAZIONE FULL SCREEN SU MOBILE
  // ==========================================
  async function handleScoutImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    setIsTyping(true);
    if (isMobile) setMobileViewTab('chat'); // Sposta subito a schermo intero sulla chat per leggere!
    try {
      const imagePart = await fileToGenerativePart(file);
      const squadContext = players.map(p => ({ nome: p.name, ruolo: p.position, stats: p.attributes }));
      const prompt = `Sei il Capo Osservatore d'élite del club "${clubName}". Esamina lo screenshot di questo giocatore esterno. Sputa un verdetto in maiuscolo (ACQUISTARE ASSOLUTAMENTE, VALIDO SOLO COME RISERVA, EVITARE/BOCCIATO). Confrontalo con l'organico attuale che controlliamo per evitare doppioni inutili: ${JSON.stringify(squadContext.slice(0, 35))}. Valuta gli attributi chiave in base al Match Engine di FM26.`;
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent([prompt, imagePart]);
      const output = result.response.text();

      const userMsg = { sender_role: `user:scout`, content: `📷 Mister ha inoltrato la foto di un calciatore per la schedatura osservatori.` };
      const aiMsg = { sender_role: 'scout', content: output };
      setMessages(prev => [...prev, userMsg, aiMsg]);
      try { await supabase.from('club_messages').insert([userMsg, aiMsg]); } catch(e){}
    } catch (err) {
      console.error(err);
    } finally {
      setIsTyping(false);
    }
  }

  async function handlePressImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    setIsTyping(true);
    if (isMobile) setMobileViewTab('chat');
    try {
      const imagePart = await fileToGenerativePart(file);
      const prompt = `Sei l'Addetto Stampa del club "${clubName}". Analizza questo screenshot di conferenza su FM26. Il Mister ha impostato l'identità mediatica: "${personality.toUpperCase()}". Trascrivi la domanda ed indica esattamente quale pulsante premere nel gioco per interpretare alla perfezione il personaggio scelto senza distruggere la determinazione dei ragazzi o causare rivolte di spogliatoio.`;
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent([prompt, imagePart]);
      const output = result.response.text();

      const userMsg = { sender_role: `user:press`, content: `📷 Mister ha inoltrato uno screenshot della conferenza stampa in corso.` };
      const aiMsg = { sender_role: 'press', content: output };
      setMessages(prev => [...prev, userMsg, aiMsg]);
      try { await supabase.from('club_messages').insert([userMsg, aiMsg]); } catch(e){}
    } catch (err) {
      console.error(err);
    } finally {
      setIsTyping(false);
    }
  }

  async function handleAnalystImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    setIsTyping(true);
    if (isMobile) setMobileViewTab('chat');
    try {
      const imagePart = await fileToGenerativePart(file);
      const prompt = `Sei il Match Analyst del club "${clubName}". Esamina lo screenshot di dati, tiri o xG di FM26. FASE 1: Estrai i dati di performance (Tiri, possesso, xG totali, errori di reparto). FASE 2: Fornisci istruzioni di squadra algoritmiche da cambiare subito nei pannelli di FM per correggere i blackout.`;
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent([prompt, imagePart]);
      const output = result.response.text();

      const userMsg = { sender_role: `user:analyst`, content: `📷 Mister ha inviato il tabellino visivo della gara per l'analisi dei flussi xG.` };
      const aiMsg = { sender_role: 'analyst', content: output };
      setMessages(prev => [...prev, userMsg, aiMsg]);
      try { await supabase.from('club_messages').insert([userMsg, aiMsg]); } catch(e){}
    } catch (e) {
      console.error(e);
    } finally {
      setIsTyping(false);
    }
  }

  async function handleFinanceImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    setIsTyping(true);
    if (isMobile) setMobileViewTab('chat');
    try {
      const imagePart = await fileToGenerativePart(file);
      const prompt = `Sei il CFO del club "${clubName}". Estrai Cassa, Budget Mercato e Budget Ingaggi da questo screen finanziario di FM26. Rispondi SOLO con JSON puro tra parentesi graffe, senza scritte o markdown: { "balance": numero, "transfer_budget": numero, "wage_budget": numero, "analysis": "analisi moneyball dettagliata su come sviluppare un sistema economico sostenibile per il club" }`;
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
    } catch (e) {
      console.error(e);
    } finally {
      setIsTyping(false);
    }
  }

  async function handleYouthImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    setIsTyping(true);
    if (isMobile) setMobileViewTab('chat');
    try {
      const imagePart = await fileToGenerativePart(file);
      const prompt = `Sei il Responsabile Giovanili del club "${clubName}". Esamina lo screenshot profilo Under 20 di FM26. Detta i punti di forza, la personalità, il livello di determinazione e stila il ruolo e focus di allenamento perfetto per massimizzare la crescita nel Match Engine.`;
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent([prompt, imagePart]);
      const output = result.response.text();

      const userMsg = { sender_role: `user:youth`, content: `📷 Mister ha scansionato il cartellino di un giovane wonderkid del vivaio.` };
      const aiMsg = { sender_role: 'youth', content: output };
      setMessages(prev => [...prev, userMsg, aiMsg]);
      try { await supabase.from('club_messages').insert([userMsg, aiMsg]); } catch(e){}
    } catch (e) {
      console.error(e);
    } finally {
      setIsTyping(false);
    }
  }

  async function handleImageUploadOCR(event) {
    const file = event.target.files[0];
    if (!file) return;
    setIsUploading(true);
    setUploadError(null);
    try {
      const imagePart = await fileToGenerativePart(file);
      const prompt = `Analizza attentamente questa griglia tabella di Football Manager. Estrai tutti i calciatori. 
      Nota Bene: La colonna dell'età può chiamarsi "Età", "Eta", "Anni" o "Age". La colonna del valore può chiamarsi "Valore", "Val", "Value" o "Val Stimat". La colonna dell'ingaggio può essere "Ingaggio", "Stip", "Stipendio" o "Wage". La colonna della media voto può essere "Media Voto", "M.V.", "Mv" o "Av Rat".
      Rispondi SOLO array JSON puro racchiuso in parentesi quadre: [ { "type": "player", "name": "Nome", "age": "num", "position": "Ruolo", "attributes": { "Gol": "num", "Media Voto": "num", "Presenze": "num", "Ingaggio": "txt", "Valore": "txt" } } ]`;
      
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent([prompt, imagePart]);
      const jsonClean = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
      const extractedData = JSON.parse(jsonClean);
      
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

      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(instructionPrompt);
      const aiMessageObj = { sender_role: activeRoom, content: result.response.text() };
      setMessages(prev => [...prev, aiMessageObj]);
      try { await supabase.from('club_messages').insert([aiMessageObj]); } catch(e) {}
    } catch (error) { console.error(error); } finally { setIsTyping(false); }
  }

  // ==========================================
  // LABORATORIO TATTICO CON RE-DIRECT DI VISUALIZZAZIONE SU MOBILE PER LETTURA COMODA
  // ==========================================
  async function handleAnalyzeExternalTactic() {
    if (!externalTacticInput.trim()) return;
    setIsTyping(true);
    if (isMobile) setMobileViewTab('chat'); // Forza lo schermo intero sulla chat per darti tutto lo spazio!
    const inputBuffer = externalTacticInput;
    setExternalTacticInput('');
    try {
      const currentSquadContext = players.map(p => ({ nome: p.name, ruolo: p.position, stats: p.attributes }));
      const prompt = `Analizza questa tattica: """${inputBuffer}""" sulla rosa ${clubName}: ${JSON.stringify(currentSquadContext.slice(0, 40))}. Dividi l'output in FASE 1 (70% analisi modulo nel Match Engine) e FASE 2 (30% screening nomi esatti promossi e bocciati da cedere).`;
      
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(prompt);
      const analysisText = result.response.text();

      const userMsg = { sender_role: `user:vice`, content: `📋 Mister ha sottoposto un assetto tattico esterno per la valutazione di compatibilità:\n"""\n${inputBuffer}\n"""` };
      const aiMsg = { sender_role: 'vice', content: analysisText };
      
      setMessages(prev => [...prev, userMsg, aiMsg]);
      try { await supabase.from('club_messages').insert([userMsg, aiMsg]); } catch(e) {}
    } catch (error) { 
      console.error(error);
    } finally { 
      setIsTyping(false); 
    }
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
    setIsTyping(true);
    if (isMobile) setMobileViewTab('chat');
    try {
      const soraPlayersContext = players.map(p => ({ nome: p.name, ruolo: p.position, stipendio: p.attributes['Ingaggio'] || '-' }));
      const prompt = `CFO Club ${clubName}. Redigi un audit finanziario Moneyball dettagliato e cinico: Cassa: €${finances.balance}. Contratti della rosa: ${JSON.stringify(soraPlayersContext.slice(0, 35))}`;
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(prompt);
      const auditOutput = result.response.text();

      const userMsg = { sender_role: `user:cfo`, content: `📊 Mister ha richiesto lo sblocco di un Audit Contabile Globale in tempo reale.` };
      const aiMsg = { sender_role: 'cfo', content: auditOutput };
      
      setMessages(prev => [...prev, userMsg, aiMsg]);
      try { await supabase.from('club_messages').insert([userMsg, aiMsg]); } catch(e) {}
    } catch (e) {
      console.error(e);
    } finally { 
      setIsTyping(false); 
    }
  }

  function handleSidebarClick(room) {
    setActiveRoom(room);
    setMobileViewTab('chat'); // Quando cambi stanza dal telefono, mostrati sempre sulla chat per impostazione predefinita
  }

  function renderChatWindow() {
    const visibleMessages = messages.filter(msg => {
      if (msg.sender_role === 'system') return true;
      if (activeRoom === 'board') {
        return msg.sender_role === 'board' || msg.sender_role === 'user:board' || msg.sender_role === 'user';
      }
      return msg.sender_role === activeRoom || msg.sender_role === `user:${activeRoom}`;
    });

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#0d0a16', width: '100%', height: '100%' }}>
        {/* HEADER STANZA */}
        <div style={{ height: '75px', padding: '0 24px', borderBottom: '2px solid #231b3a', display: 'flex', alignItems: 'center', backgroundColor: '#140f24', justifyContent: 'space-between', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <MessageSquare size={24} color="#da1b60" /> 
            <h2 style={{ fontSize: isMobile ? '16px' : '22px', color: '#ffffff', margin: 0, textTransform: 'uppercase', fontWeight: '900', letterSpacing: '0.5px' }}>
              {activeRoom === 'board' ? '🏛️ RIUNIONE PLENARIA' : `💼 BRIEFING PRIVATO: ${activeRoom.toUpperCase()}`}
            </h2>
          </div>
          {cloudStatus === 'offline' && <div style={{ fontSize: '12px', backgroundColor: '#5f0f0f', color: '#fca5a5', padding: '4px 8px', border: '1px solid #b91c1c', fontWeight: 'bold', borderRadius: '4px' }}>OFFLINE</div>}
        </div>

        {/* 📱 FIX "METÀ E METÀ": SELEZIONE SOTTOPANNELLI SU SCREEN SMARTPHONE */}
        {isMobile && (
          <div style={{ display: 'flex', backgroundColor: '#140f24', borderBottom: '2px solid #231b3a', padding: '8px', gap: '8px' }}>
            <button onClick={() => setMobileViewTab('chat')} style={{ flex: 1, padding: '12px', fontSize: '14px', fontWeight: '900', border: 'none', borderRadius: '6px', backgroundColor: mobileViewTab === 'chat' ? '#da1b60' : '#090710', color: '#fff', textTransform: 'uppercase', transition: 'all 0.2s' }}>
              💬 Leggi Dialogo
            </button>
            <button onClick={() => setMobileViewTab('tools')} style={{ flex: 1, padding: '12px', fontSize: '14px', fontWeight: '900', border: 'none', borderRadius: '6px', backgroundColor: mobileViewTab === 'tools' ? '#22d3ee' : '#090710', color: '#fff', textTransform: 'uppercase', transition: 'all 0.2s' }}>
              🛠️ Apri Strumenti
            </button>
          </div>
        )}

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', flexDirection: isMobile ? 'column' : 'row' }}>
          
          {/* VANO CHAT CENTRALIZZATO: SU MOBILE OCCUPA IL 100% SOLO SE ATTIVO IL TAB 'CHAT' */}
          {(!isMobile || mobileViewTab === 'chat') && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', borderRight: isMobile ? 'none' : '2px solid #231b3a', backgroundColor: '#090710' }}>
              <div ref={chatContainerRef} style={{ flex: 1, padding: isMobile ? '16px' : '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {visibleMessages.length === 0 ? (
                  <div style={{ margin: 'auto', maxWidth: '600px', backgroundColor: '#140f24', border: '2px solid #da1b60', padding: '32px', borderRadius: '12px', textAlign: 'center' }}>
                    <Users size={48} color="#da1b60" style={{ margin: '0 auto 16px auto' }} />
                    <h3 style={{ fontSize: '22px', color: '#fff', margin: '0 0 12px 0', fontWeight: '800' }}>Ufficio Operazioni Allineato</h3>
                    <p style={{ color: '#94a3b8', fontSize: '15px', lineHeight: '1.6', margin: '0 0 20px 0' }}>Sei a colloquio singolo. Lo specialista ha allineato la memoria storica (45 messaggi) e analizzerà in tempo reale ogni testo o screen che invierai dal pannello laterale.</p>
                    <button onClick={() => setMobileViewTab('tools')} style={{ display: isMobile ? 'inline-block' : 'none', backgroundColor: '#22d3ee', color: '#000', border: 'none', padding: '10px 20px', fontSize: '13px', fontWeight: 'bold', borderRadius: '6px', textTransform: 'uppercase' }}>Apri Strumenti Adesso</button>
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
                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '900', marginBottom: '6px', textTransform: 'uppercase' }}>{nameLabel}</span>
                        <div style={{ padding: '16px', fontSize: '16px', backgroundColor: itemBg, color: '#ffffff', borderLeft: `4px solid ${bColor}`, borderRadius: '6px', maxWidth: '85%', lineHeight: '1.6', whiteSpace: 'pre-line', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>{msg.content}</div>
                      </div>
                    );
                  })
                )}
                {isTyping && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '11px', color: '#475569', fontWeight: 'bold', marginBottom: '4px' }}>CENTRALINA DI ELABORAZIONE</span>
                    <div style={{ padding: '14px', fontSize: '15px', backgroundColor: '#140f24', color: '#64748b', borderLeft: '4px solid #475569', borderRadius: '6px', fontStyle: 'italic' }}>Lo specialista sta scrivendo la risposta tecnica nel registro...</div>
                  </div>
                )}
              </div>

              <div style={{ padding: '20px', backgroundColor: '#140f24', borderTop: '2px solid #231b3a', boxShadow: '0 -4px 15px rgba(0,0,0,0.3)' }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <ChevronRight style={{ position: 'absolute', left: '14px', color: '#da1b60' }} size={20} />
                  <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder={activeRoom === 'board' ? "Ordina una discussione generale..." : `Parla con ${activeRoom.toUpperCase()}...`} style={{ width: '100%', backgroundColor: '#090710', border: '2px solid #231b3a', padding: '16px 50px 16px 42px', fontSize: '16px', color: '#ffffff', borderRadius: '8px', outline: 'none', fontWeight: '500' }} />
                  <button onClick={handleSendMessage} disabled={isTyping} style={{ position: 'absolute', right: '16px', background: 'none', border: 'none', color: '#da1b60', cursor: 'pointer' }}><Send size={18} /></button>
                </div>
              </div>
            </div>
          )}

          {/* VANO COCKPIT STRUMENTI: SU MOBILE OCCUPA IL 100% DELLA LARGHEZZA SENZA DIVIDERSI A METÀ */}
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
                  <textarea value={externalTacticInput} onChange={(e) => setExternalTacticInput(e.target.value)} placeholder="Incolla qui l'analisi testo o il link di una tattica esterna (es. da Magicomonta o FMScout)..." style={{ width: '94%', height: '140px', backgroundColor: '#090710', border: '2px solid #231b3a', padding: '12px', color: '#ffffff', fontSize: '16px', resize: 'none', borderRadius: '6px' }} />
                  <button onClick={handleAnalyzeExternalTactic} disabled={isTyping} style={{ backgroundColor: '#22d3ee', color: '#0f0b1b', border: 'none', padding: '14px', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', borderRadius: '6px', cursor: 'pointer', width: '100%', boxShadow: '0 4px 12px rgba(34,211,238,0.2)' }}>
                    {isTyping ? "Incrocio Dati..." : "Avvia Convalida Modulo"}
                  </button>
                </>
              )}

              {activeRoom === 'scout' && (
                <>
                  <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#f43f5e', borderBottom: '2px solid #231b3a', paddingBottom: '8px', margin: 0, fontWeight: '900' }}>Osservatorio Acquisti</h3>
                  <input type="file" accept="image/*" ref={scoutInputRef} onChange={handleScoutImageUpload} style={{ display: 'none' }} />
                  <button onClick={() => scoutInputRef.current.click()} disabled={isTyping} style={{ width: '100%', backgroundColor: '#f43f5e', color: '#ffffff', border: 'none', padding: '14px', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', borderRadius: '6px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(244,63,94,0.3)' }}>
                    {isTyping ? "Scansione Profilo..." : "Carica Foto Profilo Calciatore"}
                  </button>
                </>
              )}

              {activeRoom === 'ds' && (
                <>
                  <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#fbbf24', borderBottom: '2px solid #231b3a', paddingBottom: '8px', margin: 0, fontWeight: '900' }}>Alert Contratti</h3>
                  <div style={{ backgroundColor: '#140f24', border: '2px solid #231b3a', padding: '16px', borderRadius: '6px', fontSize: '15px', lineHeight: '1.6', color: '#ffffff' }}>
                    <span style={{ color: '#fbbf24', fontWeight: 'bold', display: 'block', marginBottom: '8px', textTransform: 'uppercase', fontSize: '12px' }}>⚠️ STRUTTURA SALARIALE:</span>
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
                    <button onClick={() => financeInputRef.current.click()} disabled={isTyping} style={{ width: '100%', backgroundColor: '#10b981', color: '#0f0c1b', border: 'none', padding: '12px', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer', borderRadius: '4px' }}>Carica Screen Finanze</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                    <div><label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold' }}>Bilancio (€)</label><input type="number" value={finances.balance} onChange={(e) => updateFinancesCloud('balance', e.target.value)} style={{ width: '92%', backgroundColor: '#090710', border: '2px solid #231b3a', padding: '8px', color: '#10b981', fontWeight: 'bold', borderRadius: '4px' }} /></div>
                    <div><label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold' }}>Budget Mercato (€)</label><input type="number" value={finances.transfer_budget} onChange={(e) => updateFinancesCloud('transfer_budget', e.target.value)} style={{ width: '92%', backgroundColor: '#090710', border: '2px solid #231b3a', padding: '8px', color: '#fff', borderRadius: '4px' }} /></div>
                  </div>
                  <button onClick={handleFinanceAudit} disabled={isTyping} style={{ backgroundColor: '#da1b60', color: '#fff', border: 'none', padding: '12px', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer', borderRadius: '6px', width: '100%' }}>
                    {isTyping ? "Compilazione..." : "Genera Audit Contabile"}
                  </button>
                </>
              )}

              {activeRoom === 'press' && (
                <>
                  <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#ec4899', borderBottom: '2px solid #231b3a', paddingBottom: '8px', margin: 0, fontWeight: '900' }}>Media Strategic Hub</h3>
                  <div style={{ backgroundColor: '#140f24', border: '2px solid #231b3a', padding: '14px', borderRadius: '6px', marginBottom: '4px' }}>
                    <label style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>🎭 Personalità Allenatore:</label>
                    <select value={personality} onChange={(e) => updateCoachPersonality(e.target.value)} style={{ width: '100%', backgroundColor: '#090710', border: '2px solid #231b3a', padding: '8px', color: '#fff', fontSize: '13px', cursor: 'pointer', borderRadius: '4px' }}>
                      <option value="professional">💼 Professional (Diplomatico)</option>
                      <option value="aggressive">🔥 Aggressive (Mourinhiano)</option>
                      <option value="passionate">❤️ Passionate (Passionale / Viscerale)</option>
                    </select>
                  </div>
                  <input type="file" accept="image/*" ref={pressInputRef} onChange={handlePressImageUpload} style={{ display: 'none' }} />
                  <button onClick={() => pressInputRef.current.click()} disabled={isTyping} style={{ width: '100%', backgroundColor: '#ec4899', color: '#fff', border: 'none', padding: '12px', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', borderRadius: '6px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(236,72,153,0.3)' }}>
                    {isTyping ? "Trascrizione..." : "Carica Screenshot Conferenza"}
                  </button>
                </>
              )}

              {activeRoom === 'youth' && (
                <>
                  <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#ffaa00', borderBottom: '2px solid #231b3a', paddingBottom: '8px', margin: 0, fontWeight: '900' }}>Vivaio Under 20</h3>
                  <input type="file" accept="image/*" ref={youthInputRef} onChange={handleYouthImageUpload} style={{ display: 'none' }} />
                  <button onClick={() => youthInputRef.current.click()} disabled={isTyping} style={{ width: '100%', backgroundColor: '#ffaa00', color: '#0f0c1b', border: 'none', padding: '12px', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', borderRadius: '6px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(255,170,0,0.3)' }}>
                    {isTyping ? "Analisi Potenziale..." : "Carica Screen Profilo Giovane"}
                  </button>
                </>
              )}

              {activeRoom === 'analyst' && (
                <>
                  <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#3b82f6', borderBottom: '2px solid #231b3a', paddingBottom: '8px', margin: 0, fontWeight: '900' }}>Match Analysis Center</h3>
                  <input type="file" accept="image/*" ref={analystInputRef} onChange={handleAnalystImageUpload} style={{ display: 'none' }} />
                  <button onClick={() => analystInputRef.current.click()} disabled={isTyping} style={{ width: '100%', backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '12px', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', borderRadius: '6px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(59,130,246,0.3)' }}>
                    {isTyping ? "Estrazione Dati..." : "Carica Schermata Dati Partita"}
                  </button>
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
    const visibleList = dbSubTab === 'first_team' ? firstTeamPlayers : youthPlayers;

    const getSortValue = (player, field) => {
      switch(field) {
        case 'name': return (player.name || '').toLowerCase().trim();
        case 'position': return (player.position || '').toLowerCase().trim();
        case 'age': return parseInt(player.age) || 0;
        case 'pres': return parseInt(String(player.attributes?.Presenze || player.attributes?.Pres || '0').replace(/\D/g, '')) || 0;
        case 'gol': return parseInt(String(player.attributes?.Gol || player.attributes?.Gls || '0').replace(/\D/g, '')) || 0;
        case 'mv': return parseFloat(String(player.attributes?.['Media Voto'] || player.attributes?.Mv || '0').replace(',', '.')) || 0;
        case 'ingaggio': return parseInt(String(player.attributes?.Ingaggio || player.attributes?.Stip || '0').replace(/\D/g, '')) || 0;
        case 'valore': return parseInt(String(player.attributes?.Valore || player.attributes?.Val || '0').replace(/\D/g, '')) || 0;
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
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#0f0c1b', height: '100%', overflow: 'hidden', width: '100%' }}>
        <div style={{ height: 'auto', minHeight: '75px', padding: '12px 16px', borderBottom: '2px solid #231b3a', display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', backgroundColor: '#161224', justifyContent: 'space-between', gap: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>
          <div style={{ display: 'flex', gap: '8px', backgroundColor: '#090710', padding: '6px', border: '1px solid #231b3a', borderRadius: '6px', width: isMobile ? '100%' : 'auto', justifyContent: 'center' }}>
            <button onClick={() => setDbSubTab('first_team')} style={{ flex: isMobile ? 1 : 'none', padding: '8px 16px', border: 'none', cursor: 'pointer', textTransform: 'uppercase', fontSize: '13px', fontWeight: 'bold', backgroundColor: dbSubTab === 'first_team' ? '#da1b60' : 'transparent', color: '#fff', borderRadius: '4px' }}>Prima Squadra ({firstTeamPlayers.length})</button>
            <button onClick={() => setDbSubTab('youth')} style={{ flex: isMobile ? 1 : 'none', padding: '8px 16px', border: 'none', cursor: 'pointer', textTransform: 'uppercase', fontSize: '13px', fontWeight: 'bold', backgroundColor: dbSubTab === 'youth' ? '#ffaa00' : 'transparent', color: '#fff', borderRadius: '4px' }}>Under 20 ({youthPlayers.length})</button>
          </div>
          <div style={{ display: 'flex', gap: '10px', width: isMobile ? '100%' : 'auto', justifyContent: 'center' }}>
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUploadOCR} style={{ display: 'none' }} />
            <button onClick={() => fileInputRef.current.click()} disabled={isUploading} style={{ flex: isMobile ? 1 : 'none', backgroundColor: '#da1b60', color: '#fff', border: 'none', padding: '10px 20px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer', borderRadius: '6px' }}>Carica Foto Rosa</button>
            {players.length > 0 && <button onClick={handleClearAllData} style={{ backgroundColor: 'transparent', border: '2px solid #ef4444', color: '#ef4444', padding: '10px 16px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer', borderRadius: '6px' }}>Azzera</button>}
          </div>
        </div>

        <div style={{ flex: 1, padding: isMobile ? '12px' : '24px', overflowY: 'auto', backgroundColor: '#090710', width: '100%', boxSizing: 'border-box' }}>
          {visibleList.length === 0 ? <div style={{ textAlign: 'center', padding: '32px', color: '#64748b', fontSize: '14px', fontWeight: 'bold', border: '2px dashed #231b3a', backgroundColor: '#140f24', borderRadius: '8px' }}>Nessun calciatore in archivio per il club {clubName.toUpperCase()}.</div> : (
            <div style={{ backgroundColor: '#140f24', border: '2px solid #231b3a', borderRadius: '8px', overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: isMobile ? '600px' : '850px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#1d1733', borderBottom: '3px solid #090710' }}>
                    <th onClick={() => handleSort('name')} style={{ padding: '12px 10px', color: '#ffffff', fontSize: '12px', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none', borderRight: '1px solid #231b3a', fontWeight: '900' }}>Nome {sortField === 'name' ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ''}</th>
                    <th onClick={() => handleSort('position')} style={{ padding: '12px 10px', color: '#ffffff', fontSize: '12px', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none', borderRight: '1px solid #231b3a', fontWeight: '900' }}>Ruolo {sortField === 'position' ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ''}</th>
                    <th onClick={() => handleSort('age')} style={{ padding: '12px 10px', color: '#ffffff', fontSize: '12px', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none', textAlign: 'center', borderRight: '1px solid #231b3a', fontWeight: '900' }}>Età {sortField === 'age' ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ''}</th>
                    <th onClick={() => handleSort('pres')} style={{ padding: '12px 10px', color: '#ffffff', fontSize: '12px', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none', textAlign: 'center', borderRight: '1px solid #231b3a', fontWeight: '900' }}>Pres {sortField === 'pres' ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ''}</th>
                    <th onClick={() => handleSort('gol')} style={{ padding: '12px 10px', color: '#ffffff', fontSize: '12px', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none', textAlign: 'center', borderRight: '1px solid #231b3a', fontWeight: '900' }}>Gol {sortField === 'gol' ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ''}</th>
                    <th onClick={() => handleSort('mv')} style={{ padding: '12px 10px', color: '#ffffff', fontSize: '12px', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none', textAlign: 'center', borderRight: '1px solid #231b3a', fontWeight: '900' }}>M.V. {sortField === 'mv' ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ''}</th>
                    <th onClick={() => handleSort('ingaggio')} style={{ padding: '12px 10px', color: '#ffffff', fontSize: '12px', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none', textAlign: 'center', borderRight: '1px solid #231b3a', fontWeight: '900' }}>Ing. {sortField === 'ingaggio' ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ''}</th>
                    <th onClick={() => handleSort('valore')} style={{ padding: '12px 10px', color: '#ffffff', fontSize: '12px', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none', textAlign: 'right', fontWeight: '900' }}>Val {sortField === 'valore' ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ''}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedList.map((p, idx) => {
                    const wStr = p.attributes?.Ingaggio || p.attributes?.Stip || '0'; const wNum = parseInt(wStr.replace(/\D/g, '')) || 0;
                    const mv = parseFloat(String(p.attributes?.['Media Voto'] || p.attributes?.Mv).replace(',', '.')) || 0;
                    const gol = parseInt(p.attributes?.Gol || p.attributes?.Gls) || 0; const pres = parseInt(p.attributes?.Presenze || p.attributes?.Pres) || 0;
                    const isTopPlayer = (mv >= 7.10 && pres > 2) || gol >= 5; const isToxicContract = wNum > 1200 && (mv < 6.50 && pres > 3);
                    return (
                      <tr key={idx} onClick={() => setSelectedProfile(p)} style={{ borderBottom: '1px solid #231b3a', cursor: 'pointer', backgroundColor: selectedProfile?.name === p.name ? '#271e44' : 'transparent' }}>
                        <td style={{ padding: '12px 10px', fontWeight: 'bold', color: '#ffffff', fontSize: '14px' }}>{p.name} {isTopPlayer && <span style={{ fontSize: '9px', backgroundColor: '#34d399', color: '#0f0c1b', padding: '1px 4px', borderRadius: '3px', fontWeight: '900' }}>TOP</span>} {isToxicContract && <span style={{ fontSize: '9px', backgroundColor: '#ef4444', color: '#fff', padding: '1px 4px', borderRadius: '3px', fontWeight: '900' }}>TOSSICO</span>}</td>
                        <td style={{ padding: '12px 10px', color: '#22d3ee', fontWeight: '700', fontSize: '13px' }}>{p.position || 'N/D'}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'center', color: '#f8fafc', fontWeight: 'bold', fontSize: '13px' }}>{p.age || '-'}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'center', color: '#cbd5e1', fontFamily: 'monospace', fontSize: '13px' }}>{p.attributes?.Presenze || p.attributes?.Pres || '-'}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'center', color: '#ffffff', fontWeight: 'bold', fontFamily: 'monospace', fontSize: '14px' }}>{p.attributes?.Gol || p.attributes?.Gls || '-'}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'center', color: '#34d399', fontWeight: 'bold', fontFamily: 'monospace', fontSize: '14px' }}>{p.attributes?.['Media Voto'] || p.attributes?.Mv || '-'}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'center', color: '#e2e8f0', fontFamily: 'monospace', fontSize: '13px' }}>{p.attributes?.Ingaggio || p.attributes?.Stip || '-'}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'right', color: '#e2e8f0', fontFamily: 'monospace', fontSize: '13px', fontWeight: '700' }}>{p.attributes?.Valore || p.attributes?.Val || '-'}</td>
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

  const navContainerStyle = isMobile ? {
    position: 'fixed', bottom: 0, left: 0, right: 0, height: '70px', width: '100%',
    backgroundColor: '#140f24', borderTop: '2px solid #231b3a', display: 'flex',
    flexDirection: 'row', alignItems: 'center', padding: '0 10px', gap: '14px',
    overflowX: 'auto', zIndex: 1000, boxShadow: '0 -4px 20px rgba(0,0,0,0.6)',
    WebkitOverflowScrolling: 'touch'
  } : {
    width: '90px', backgroundColor: '#140f24', borderRight: '2px solid #231b3a',
    display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '20px',
    gap: '16px', zIndex: 10, boxShadow: '4px 0 15px rgba(0,0,0,0.5)'
  };

  const navButtonStyle = (room, color) => ({
    background: activeRoom === room ? '#271e44' : 'none',
    border: activeRoom === room ? `2px solid ${color}` : '2px solid transparent',
    color: activeRoom === room ? color : '#475569',
    padding: '10px', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
  });

  return (
    <div style={{ display: 'flex', height: '100vh', flexDirection: isMobile ? 'column' : 'row', backgroundColor: '#090710', color: '#cbd5e1', fontFamily: 'system-ui, -apple-system, sans-serif', overflow: 'hidden' }}>
      
      <div style={navContainerStyle}>
        {!isMobile && <div style={{ width: '52px', height: '52px', backgroundColor: '#da1b60', display: 'flex', alignItems: 'center', color: '#fff', fontWeight: '900', fontSize: '22px', borderRadius: '10px', justifyContent: 'center' }}>FM</div>}
        
        <button onClick={() => handleSidebarClick('board')} title="Tavolo Plenaria" style={navButtonStyle('board', '#a855f7')}><Users size={22} /></button>
        <button onClick={() => handleSidebarClick('vice')} title="Ufficio Vice Allenatore" style={navButtonStyle('vice', '#22d3ee')}><Sliders size={22} /></button>
        <button onClick={() => handleSidebarClick('scout')} title="Ufficio Capo Osservatore" style={navButtonStyle('scout', '#f43f5e')}><Search size={22} /></button>
        <button onClick={() => handleSidebarClick('ds')} title="Ufficio Direttore Sportivo" style={navButtonStyle('ds', '#fbbf24')}><Briefcase size={22} /></button>
        <button onClick={() => handleSidebarClick('cfo')} title="Ufficio CFO Finanze" style={navButtonStyle('cfo', '#10b981')}><TrendingUp size={22} /></button>
        <button onClick={() => handleSidebarClick('press')} title="Ufficio Stampa Conferenze" style={navButtonStyle('press', '#ec4899')}><HelpCircle size={22} /></button>
        <button onClick={() => handleSidebarClick('youth')} title="Ufficio Responsabile Giovanili" style={navButtonStyle('youth', '#ffaa00')}><Award size={22} /></button>
        <button onClick={() => handleSidebarClick('analyst')} title="Ufficio Match Analyst" style={navButtonStyle('analyst', '#3b82f6')}><Activity size={22} /></button>
        
        {!isMobile && <div style={{ width: '44px', height: '2px', backgroundColor: '#231b3a', margin: '6px 0' }}></div>}
        <button onClick={() => handleSidebarClick('database')} title="Plancia Organico Database" style={navButtonStyle('database', '#da1b60')}><Database size={22} /></button>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingBottom: isMobile ? '70px' : '0px' }}>
        {activeRoom !== 'database' && renderChatWindow()}
        {activeRoom === 'database' && renderMasterDatabase()}
      </div>

      {selectedProfile && (
        <div style={{ position: 'fixed', right: isMobile ? '10px' : '25px', bottom: isMobile ? '80px' : '25px', left: isMobile ? '10px' : 'auto', width: isMobile ? 'calc(100% - 20px)' : '340px', backgroundColor: '#140f24', border: '3px solid #da1b60', padding: '16px', borderRadius: '12px', boxShadow: '0 30px 60px rgba(0,0,0,0.9)', zIndex: 5000, boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #231b3a', paddingBottom: '10px', marginBottom: '12px', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '10px', color: '#da1b60', fontWeight: '900', textTransform: 'uppercase' }}>PARAMETRI SCHEDATI</span>
              <h4 style={{ fontSize: '18px', color: '#ffffff', margin: '2px 0 0 0', fontWeight: '900' }}>{selectedProfile.name}</h4>
            </div>
            <button onClick={() => setSelectedProfile(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}><X size={20} /></button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', padding: '8px 12px', backgroundColor: '#090710', border: '1px solid #231b3a', borderRadius: '6px' }}><span style={{ color: '#94a3b8' }}>Ruolo</span><span style={{ color: '#22d3ee', fontWeight: '900' }}>{selectedProfile.position || 'N/D'}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', padding: '8px 12px', backgroundColor: '#090710', border: '1px solid #231b3a', borderRadius: '6px' }}><span style={{ color: '#94a3b8' }}>Età</span><span style={{ color: '#ffffff', fontWeight: '900' }}>{selectedProfile.age || 'N/D'}</span></div>
            {Object.entries(selectedProfile.attributes).map(([key, val]) => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', padding: '8px 12px', backgroundColor: '#090710', border: '1px solid #231b3a', borderRadius: '6px' }}><span style={{ color: '#94a3b8' }}>{key}</span><span style={{ color: '#34d399', fontWeight: '900', fontFamily: 'monospace' }}>{String(val)}</span></div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}

export default App
