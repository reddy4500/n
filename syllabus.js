// NEET PG syllabus: 19 subjects, approximate question counts in the 200-MCQ pattern.
// Weightage is indicative only — NBEMS does not publish an official split and it varies each year.
export const SUBJECTS = [
  { id: 'anatomy', name: 'Anatomy', w: 10, aliases: ['anatomy', 'anat'], topics: ['Upper limb', 'Lower limb', 'Thorax', 'Abdomen & pelvis', 'Head & neck', 'Neuroanatomy', 'Embryology', 'Histology', 'Genetics'] },
  { id: 'physiology', name: 'Physiology', w: 10, aliases: ['physiology', 'physio'], topics: ['General & nerve-muscle', 'Blood', 'CVS', 'Respiratory', 'Renal', 'GIT', 'Endocrine', 'Reproductive', 'Neurophysiology', 'Special senses'] },
  { id: 'biochemistry', name: 'Biochemistry', w: 10, aliases: ['biochemistry', 'biochem', 'bio chemistry'], topics: ['Enzymes', 'Carbohydrate metabolism', 'Lipid metabolism', 'Protein & amino acids', 'Vitamins & minerals', 'Molecular biology', 'Inborn errors of metabolism', 'Nutrition'] },
  { id: 'pathology', name: 'Pathology', w: 15, aliases: ['pathology', 'patho'], topics: ['Cell injury', 'Inflammation & repair', 'Hemodynamics', 'Immunity', 'Neoplasia', 'Genetic disorders', 'Hematology', 'CVS pathology', 'Renal pathology', 'GIT & liver pathology', 'CNS pathology'] },
  { id: 'pharmacology', name: 'Pharmacology', w: 14, aliases: ['pharmacology', 'pharma', 'pharmac'], topics: ['General pharmacology', 'ANS', 'CVS drugs', 'CNS drugs', 'Autacoids & NSAIDs', 'Endocrine drugs', 'Chemotherapy - antimicrobials', 'Anticancer drugs', 'Antidotes & toxicology', 'Recent drugs'] },
  { id: 'microbiology', name: 'Microbiology', w: 13, aliases: ['microbiology', 'micro'], topics: ['General microbiology', 'Immunology', 'Bacteriology', 'Virology', 'Mycology', 'Parasitology', 'Sterilisation & lab methods'] },
  { id: 'fmt', name: 'Forensic Medicine', w: 7, aliases: ['forensic', 'fmt', 'forensic medicine', 'toxicology'], topics: ['Identification', 'Thanatology', 'Injuries', 'Asphyxial deaths', 'Sexual offences', 'Toxicology', 'Legal procedures & IPC/BNS'] },
  { id: 'psm', name: 'Community Medicine (PSM)', w: 20, aliases: ['psm', 'spm', 'community medicine', 'preventive', 'social medicine'], topics: ['Epidemiology', 'Biostatistics', 'Screening', 'Communicable diseases', 'Non-communicable diseases', 'National health programmes', 'Nutrition', 'Environment & occupational health', 'MCH & family planning', 'Health care delivery in India', 'Vaccines & immunisation'] },
  { id: 'medicine', name: 'Medicine', w: 20, aliases: ['medicine', 'general medicine', 'internal medicine'], topics: ['Cardiology', 'Respiratory', 'Gastroenterology & hepatology', 'Nephrology', 'Endocrinology', 'Neurology', 'Hematology', 'Rheumatology', 'Infectious diseases', 'Critical care & ECG'] },
  { id: 'surgery', name: 'Surgery', w: 18, aliases: ['surgery', 'general surgery'], topics: ['Trauma & burns', 'Breast', 'Thyroid & endocrine surgery', 'Hernia', 'Hepatobiliary & pancreas', 'Stomach & intestines', 'Colorectal', 'Urology', 'Vascular', 'Neurosurgery', 'Paediatric surgery'] },
  { id: 'obg', name: 'Obstetrics & Gynaecology', w: 18, aliases: ['obg', 'obgyn', 'obstetrics', 'gynaecology', 'gynecology', 'gynae', 'gyne'], topics: ['Physiology of pregnancy', 'Antenatal care', 'Labour', 'Obstetric haemorrhage', 'Hypertensive disorders', 'Medical disorders in pregnancy', 'Menstrual disorders', 'Infertility', 'Contraception', 'Gynaecological oncology'] },
  { id: 'pediatrics', name: 'Paediatrics', w: 8, aliases: ['pediatrics', 'paediatrics', 'peds', 'paeds', 'pediatric'], topics: ['Growth & development', 'Neonatology', 'Nutrition & malnutrition', 'Immunisation', 'Genetic & metabolic', 'Paediatric infections', 'Paediatric cardiology', 'Paediatric emergencies'] },
  { id: 'ent', name: 'ENT', w: 8, aliases: ['ent', 'e n t', 'ear nose throat', 'otorhinolaryngology'], topics: ['Ear', 'Nose & PNS', 'Pharynx', 'Larynx', 'Head & neck tumours', 'Audiology'] },
  { id: 'ophthalmology', name: 'Ophthalmology', w: 8, aliases: ['ophthalmology', 'ophthal', 'ophtha', 'eye'], topics: ['Cornea & conjunctiva', 'Lens & cataract', 'Glaucoma', 'Uvea', 'Retina', 'Neuro-ophthalmology', 'Squint', 'Community ophthalmology'] },
  { id: 'orthopedics', name: 'Orthopaedics', w: 5, aliases: ['orthopedics', 'orthopaedics', 'ortho'], topics: ['Fractures upper limb', 'Fractures lower limb', 'Nerve injuries', 'Bone tumours', 'Infections', 'Paediatric ortho', 'Spine'] },
  { id: 'dermatology', name: 'Dermatology', w: 4, aliases: ['dermatology', 'derma', 'derm', 'skin'], topics: ['Papulosquamous disorders', 'Vesiculobullous disorders', 'Infections', 'Leprosy', 'STDs', 'Pigmentary disorders'] },
  { id: 'psychiatry', name: 'Psychiatry', w: 4, aliases: ['psychiatry', 'psych', 'psychology'], topics: ['Schizophrenia', 'Mood disorders', 'Anxiety disorders', 'Substance use', 'Psychopharmacology', 'Child psychiatry'] },
  { id: 'anesthesia', name: 'Anaesthesia', w: 4, aliases: ['anesthesia', 'anaesthesia', 'anesthesiology'], topics: ['Airway', 'Inhalational agents', 'IV agents', 'Muscle relaxants', 'Local & regional', 'CPR & monitoring'] },
  { id: 'radiology', name: 'Radiology', w: 4, aliases: ['radiology', 'radio', 'radiodiagnosis'], topics: ['Imaging modalities', 'Chest imaging', 'Neuroimaging', 'Radiotherapy', 'Contrast & safety'] },
];

export const byId = Object.fromEntries(SUBJECTS.map(s => [s.id, s]));
export const subjectName = id => byId[id]?.name || id;

export function findSubject(text) {
  const t = ` ${text.toLowerCase()} `;
  let best = null, len = 0;
  for (const s of SUBJECTS) for (const a of s.aliases) {
    if (t.includes(` ${a}`) && a.length > len) { best = s; len = a.length; }
  }
  return best;
}

// Weighted list of subject ids for a mixed test of n questions.
export function subjectMix(n) {
  const total = SUBJECTS.reduce((a, s) => a + s.w, 0);
  if (n < 40) { // small sets: weighted random sampling for variety
    return Array.from({ length: n }, () => {
      let r = Math.random() * total;
      for (const s of SUBJECTS) { r -= s.w; if (r <= 0) return s.id; }
      return SUBJECTS[0].id;
    });
  }
  const list = [];
  const rema = [];
  for (const s of SUBJECTS) {
    const exact = (s.w / total) * n;
    const k = Math.floor(exact);
    for (let i = 0; i < k; i++) list.push(s.id);
    rema.push([exact - k, s.id]);
  }
  rema.sort((a, b) => b[0] - a[0]);
  for (let i = 0; list.length < n; i++) list.push(rema[i % rema.length][1]);
  return shuffle(list);
}

export function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
