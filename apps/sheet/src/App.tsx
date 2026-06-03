import { AiActionPanel, AiSettings, AiSidebar, useAiSettings, useAiSidebar } from '@234/ai-sidebar';
import { exportXlsx, importXlsx, type ImportReport } from '@234/compat';
import { SheetEngine } from '@234/formula-engine';
import {
  Button,
  CommandPalette,
  ImportReportPanel,
  registerCommand,
  toggleTheme,
  useCommandPalette,
} from '@234/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './App.module.css';
import { type Chart, chartValues } from './charts/chart';
import { ChartDialog } from './charts/ChartDialog';
import { ChartView } from './charts/ChartView';
import { applyCells } from './fwsh';
import { ColumnInspector, type ColumnSchemaValue } from './grid/ColumnInspector';
import { FormulaBar } from './grid/FormulaBar';
import { Grid, type ColumnTypeMap, type NumericRule } from './grid/Grid';
import { NameBox } from './grid/NameBox';
import { sheetActions } from './ai/sheetActions';
import { LinkAuditor } from './inspector/LinkAuditor';
import { RuleDialog, type RuleDraft } from './inspector/RuleDialog';

type Panel = 'none' | 'column' | 'links' | 'chart' | 'conditional' | 'validation';

export default function App() {
  const palette = useCommandPalette();
  const [engine] = useState(() => {
    const created = new SheetEngine();
    created.setCell(0, 0, '10');
    created.setCell(1, 0, '20');
    created.setCell(2, 0, '30');
    created.defineName('total', 0, 1);
    created.setCell(0, 1, '=SUM(A1:A3)');
    return created;
  });
  const [active, setActive] = useState({ row: 0, col: 0 });
  const [revision, setRevision] = useState(0);
  const [columnTypes, setColumnTypes] = useState<ColumnTypeMap>({});
  const [panel, setPanel] = useState<Panel>('none');
  const [chart, setChart] = useState<Chart | null>(null);
  const [conditionalRule, setConditionalRule] = useState<NumericRule | null>(null);
  const [validationRule, setValidationRule] = useState<NumericRule | null>(null);
  const ai = useAiSidebar('sheet');
  const { settings: aiSettings, setSettings: setAiSettings, provider: aiProvider } = useAiSettings();
  const [importReport, setImportReport] = useState<ImportReport | null>(null);
  const bump = useCallback(() => setRevision((value) => value + 1), []);

  const activeRef = useRef(active);
  activeRef.current = active;

  // Open an .xlsx → replace the sheet's cells (via @234/compat) + show the report.
  const openXlsx = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      void file.arrayBuffer().then((buffer) => {
        const { cells, report } = importXlsx(new Uint8Array(buffer));
        engine.destroy();
        applyCells(engine, cells);
        setImportReport(report);
        bump();
      });
    };
    input.click();
  }, [engine, bump]);

  // Export the used range to a downloadable .xlsx.
  const handleExportXlsx = useCallback(() => {
    const { rows, cols } = engine.usedRange();
    const cells: string[][] = Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => engine.getRaw(r, c)),
    );
    const bytes = exportXlsx(cells);
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'spreadsheet.xlsx';
    anchor.click();
    URL.revokeObjectURL(url);
  }, [engine]);

  const setColumnType = (col: number, schema: ColumnSchemaValue) => {
    setColumnTypes((prev) => ({ ...prev, [col]: schema }));
  };

  // Resolve a rule threshold: a number, or a single named/A1 ref via the engine.
  const resolveThreshold = (expr: string): number | null => {
    const direct = Number(expr);
    if (expr.trim() !== '' && Number.isFinite(direct)) return direct;
    try {
      const value = engine.readRange(expr)[0];
      return typeof value === 'number' ? value : null;
    } catch {
      return null;
    }
  };

  const applyRule = (draft: RuleDraft, set: (rule: NumericRule | null) => void) => {
    const threshold = resolveThreshold(draft.threshold);
    set(threshold === null ? null : { op: draft.op, threshold });
    setPanel('none');
  };

  useEffect(() => {
    const unregister = [
      registerCommand({
        id: 'sheet.insert-row',
        title: 'Insert row above',
        group: 'Data',
        run: () => {
          engine.insertRow(activeRef.current.row);
          bump();
        },
      }),
      registerCommand({
        id: 'sheet.insert-col',
        title: 'Insert column left',
        group: 'Data',
        run: () => {
          engine.insertColumn(activeRef.current.col);
          bump();
        },
      }),
      registerCommand({ id: 'sheet.recalculate', title: 'Recalculate', group: 'Data', run: bump }),
      registerCommand({
        id: 'sheet.set-column-type',
        title: 'Set column type',
        group: 'Data',
        run: () => setPanel('column'),
      }),
      registerCommand({
        id: 'sheet.audit-links',
        title: 'Audit external links',
        group: 'Data',
        run: () => setPanel('links'),
      }),
      registerCommand({
        id: 'sheet.insert-chart',
        title: 'Insert chart',
        group: 'Insert',
        run: () => setPanel('chart'),
      }),
      registerCommand({
        id: 'sheet.conditional-format',
        title: 'Conditional formatting',
        group: 'Format',
        run: () => setPanel('conditional'),
      }),
      registerCommand({
        id: 'sheet.data-validation',
        title: 'Data validation',
        group: 'Data',
        run: () => setPanel('validation'),
      }),
      registerCommand({ id: 'sheet.open-xlsx', title: 'Open .xlsx', group: 'File', run: openXlsx }),
      registerCommand({ id: 'sheet.export-xlsx', title: 'Export .xlsx', group: 'File', run: handleExportXlsx }),
      registerCommand({
        id: 'sheet.ai',
        title: 'Toggle AI assistant',
        group: 'AI',
        run: () => ai.toggle(),
      }),
      registerCommand({
        id: 'sheet.toggle-theme',
        title: 'Toggle theme',
        group: 'View',
        run: () => toggleTheme(),
      }),
      registerCommand({
        id: 'sheet.about',
        title: 'About 234 Sheet',
        group: 'Help',
        run: () => console.info('234 Sheet — Phase 2'),
      }),
    ];
    return () => {
      for (const remove of unregister) remove();
    };
  }, [engine, bump, ai, openXlsx, handleExportXlsx]);

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>234 Sheet</h1>
        <div className={styles.actions}>
          <Button variant="ghost" onClick={openXlsx}>
            Open .xlsx
          </Button>
          <Button variant="ghost" onClick={handleExportXlsx}>
            Export .xlsx
          </Button>
          <Button variant="ghost" onClick={ai.toggle}>
            AI assistant
          </Button>
          <Button variant="secondary" onClick={palette.open}>
            Command palette
          </Button>
        </div>
      </header>
      {importReport ? (
        <ImportReportPanel report={importReport} onClose={() => setImportReport(null)} />
      ) : null}
      <div className={styles.formulaRow}>
        <NameBox engine={engine} active={active} onCommit={bump} />
        <FormulaBar engine={engine} active={active} onCommit={bump} />
      </div>
      {panel === 'column' ? (
        <ColumnInspector col={active.col} schema={columnTypes[active.col]} onChange={setColumnType} />
      ) : null}
      {panel === 'links' ? <LinkAuditor engine={engine} revision={revision} /> : null}
      {panel === 'chart' ? (
        <ChartDialog
          engine={engine}
          onApply={(next) => {
            setChart(next);
            setPanel('none');
          }}
          onClose={() => setPanel('none')}
        />
      ) : null}
      {panel === 'conditional' ? (
        <RuleDialog
          engine={engine}
          title="Conditional formatting"
          onApply={(draft) => applyRule(draft, setConditionalRule)}
          onClose={() => setPanel('none')}
        />
      ) : null}
      {panel === 'validation' ? (
        <RuleDialog
          engine={engine}
          title="Data validation"
          onApply={(draft) => applyRule(draft, setValidationRule)}
          onClose={() => setPanel('none')}
        />
      ) : null}
      {chart ? (
        <ChartView type={chart.type} values={chartValues(engine, chart.range)} title={chart.title} />
      ) : null}
      <div className={styles.gridRow}>
        <div className={styles.gridMain}>
          <Grid
            engine={engine}
            active={active}
            onSelect={(row, col) => setActive({ row, col })}
            revision={revision}
            columnTypes={columnTypes}
            conditionalRule={conditionalRule}
            validationRule={validationRule}
          />
        </div>
        <AiSidebar open={ai.isOpen} onClose={ai.close} app="sheet">
          <AiSettings settings={aiSettings} onChange={setAiSettings} />
          <AiActionPanel
            actions={sheetActions({
              engine,
              active,
              onInsertFormula: (formula) => {
                engine.setCell(active.row, active.col, formula);
                bump();
              },
            })}
            provider={aiProvider}
          />
        </AiSidebar>
      </div>
      <CommandPalette isOpen={palette.isOpen} onClose={palette.close} context={{ app: 'sheet' }} />
    </div>
  );
}
