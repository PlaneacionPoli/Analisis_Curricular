"""Prueba de integración: extracción + análisis completo con 3 archivos reales."""
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))
import logging
logging.basicConfig(level=logging.WARNING)

TEST_FILES = [
    'data/raw/FORMATOS RA CICLO UNO RC/FormatoRA_ContPub_PBOG.xlsx',
    'data/raw/FORMATOS RA CICLO UNO RC/FormatoRA_EspGerMercadeo_VNAL.xlsx',
    'data/raw/FORMATOS RA CICLO UNO RC/FormatoRA_TecnolDesarrolloSoftware_PBOG.xlsx',
]

passed = 0
failed = 0

# 1. Extraction test
print("="*60)
print("FASE 1: EXTRACCIÓN")
print("="*60)
from src.extractor import ExcelExtractor

for f in TEST_FILES:
    p = Path(f)
    if not p.exists():
        print(f"  [X] MISSING: {f}")
        failed += 1
        continue
    try:
        ext = ExcelExtractor(str(p))
        data = ext.extract_all()
        meta = data['metadata']
        df_micro = data.get('estrategias_micro')
        df_perfil = data.get('perfil_egreso')
        df_ra = data.get('resultados_aprendizaje')
        print(f"  [OK] {p.name}")
        print(f"       Programa: {meta.get('programa','?')} | Sede: {meta.get('sede','?')} | Modalidad: {meta.get('modalidad','?')}")
        print(f"       Micro: {len(df_micro) if df_micro is not None else 0} rows | Perfil: {len(df_perfil) if df_perfil is not None else 0} rows | RA: {len(df_ra) if df_ra is not None else 0} rows")
        passed += 1
    except Exception as e:
        print(f"  [X] ERROR: {p.name}: {e}")
        failed += 1

# 2. Nucleos cleaner test
print("\n" + "="*60)
print("FASE 2: NÚCLEOS CLEANER")
print("="*60)
from src.nucleos_cleaner import es_nucleo_valido
test_inputs = [
    ('Análisis financiero de estados contables', True),
    ('Expansión A', False),
    ('Salgamos', False),
    ('Mate', False),
]
for text, expected in test_inputs:
    val, _ = es_nucleo_valido(text)
    ok = val == expected
    status = "OK" if ok else "FAIL"
    print(f"  [{status}] es_nucleo_valido('{text}') = {val} (expected {expected})")
    if ok: passed += 1
    else: failed += 1

# 3. Perfil coverage test
print("\n" + "="*60)
print("FASE 3: PERFIL COVERAGE")
print("="*60)
from src.perfil_coverage_analyzer import analizar_cobertura_perfil_completa

for f in TEST_FILES:
    p = Path(f)
    if not p.exists():
        continue
    try:
        ext = ExcelExtractor(str(p))
        data = ext.extract_all()
        df_perfil = data.get('perfil_egreso', None)
        df_micro = data.get('estrategias_micro', None)
        df_ra = data.get('resultados_aprendizaje', None)
        if df_perfil is not None and df_micro is not None:
            result = analizar_cobertura_perfil_completa(df_perfil, df_micro, df_ra)
            print(f"  [OK] {p.name}: cobertura={result['cobertura_global']:.1f}%, brechas={result['num_brechas']}/{result['total_elementos']}")
            passed += 1
        else:
            print(f"  [!] {p.name}: saltado (sin perfil o micro)")
    except Exception as e:
        print(f"  [X] ERROR: {p.name}: {e}")
        failed += 1

# 4. Shared subjects test
print("\n" + "="*60)
print("FASE 4: ASIGNATURAS COMPARTIDAS")
print("="*60)
import pandas as pd
dfs = []
for f in TEST_FILES:
    p = Path(f)
    if not p.exists():
        continue
    try:
        ext = ExcelExtractor(str(p))
        data = ext.extract_all()
        df = data.get('estrategias_micro', None)
        if df is not None and len(df) > 0:
            df['Programa'] = data['metadata'].get('programa', p.stem)
            df['Sede'] = data['metadata'].get('sede', '')
            dfs.append(df)
    except Exception as e:
        print(f"  [X] ERROR extrayendo {p.name}: {e}")

if len(dfs) >= 2:
    combined = pd.concat(dfs, ignore_index=True)
    from src.shared_subjects_analyzer import detectar_asignaturas_compartidas
    result = detectar_asignaturas_compartidas(combined)
    r = result['resumen']
    print(f"  [OK] {r['total_programas']} programas, {r['pares_intra_sede']} pares intra-sede, {r['pares_inter_programa']} pares inter-programa")
    passed += 1
else:
    print(f"  [!]  Solo {len(dfs)} programa(s) con datos, se necesitan ≥ 2")

# 5. Topic modeler test
print("\n" + "="*60)
print("FASE 5: TOPIC MODELER")
print("="*60)
all_corpus = []
for f in TEST_FILES:
    p = Path(f)
    if not p.exists():
        continue
    try:
        ext = ExcelExtractor(str(p))
        data = ext.extract_all()
        df_ra = data.get('resultados_aprendizaje', None)
        if df_ra is not None and 'SaberAsociado' in df_ra.columns:
            docs = df_ra['SaberAsociado'].dropna().astype(str).str.lower().tolist()
            docs = [d for d in docs if len(d) > 10]
            all_corpus.extend(docs)
    except Exception as e:
        print(f"  [X] ERROR: {p.name}: {e}")

if len(all_corpus) >= 5:
    from src.topic_modeler import entrenar_lda
    result = entrenar_lda(all_corpus, n_topics=3, n_top_words=8)
    print(f"  [OK] LDA: {len(result['topics'])} topics sobre {result.get('corpus_size', len(all_corpus))} docs")
    for i, topic in enumerate(result['topics']):
        print(f"       Topic {i+1}: {', '.join(topic['top_words'][:5])}...")
    passed += 1
else:
    print(f"  [!] Corpus insuficiente ({len(all_corpus)} docs, need ≥5)")

# Summary
print("\n" + "="*60)
print(f"RESULTADO: {passed} checks passed, {failed} failed")
print("="*60)
if __name__ == '__main__':
    sys.exit(0 if failed == 0 else 1)
