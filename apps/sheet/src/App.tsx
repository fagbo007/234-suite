import { AiActionPanel, AiSettings, AiSidebar, useAiSettings, useAiSidebar } from '@234/ai-sidebar';
import { exportXlsx, importXlsx, type ImportReport } from '@234/compat';
import { SheetEngine } from '@234/formula-engine';
import {
  Button,
  CollabPanel,
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
import { Grid, type ColumnTypeMap } from './grid/Grid';
import { NameBox } from './grid/NameBox';
import { usePresence } from '@234/collab';
import { sheetActions } from './ai/sheetActions';
import { useSheetCollab } from './collab/useSheetCollab';
import { LinkAuditor } from './inspector/LinkAuditor';
import { RuleDialog } from './inspector/RuleDialog';

type Panel = 'none' | 'column' | 'links' | 'chart' | 'conditional' | 'validation' | 'collab';

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
  const [conditionalRule, setConditionalRule] = useState<string | null>(null);
  const [validationRule, setValidationRule] = useState<string | null>(null);
  const ai = useAiSidebar('sheet');
  const { settings: aiSettings, setSettings: setAiSettings, provider: aiProvider } = useAiSettings();
  const [importReport, setImportReport] = useState<ImportReport | null>(null);
  const bump = useCallback(() => setRevision((value) => value + 1), []);

  // Optional collaboration: when a session is active, cell edits + named refs +
  // column types flow through the shared Yjs doc; otherwise straight to the
  // engine / local state. Off by default (root §17).
  const collab = useSheetCollab(engine, bump, {
    columnTypes,
    onRemoteColumnType: (col, schema) => {
      setColumnTypes((prev) => {
        if (schema === null) {
          const next = { ...prev };
          delete next[col];
          return next;
        }
        return { ...prev, [col]: schema };
      });
      bump();
    },
    chart,
    onRemoteChart: (next) => {
      setChart(next);
      bump();
    },
  });
  const peers = usePresence(collab.doc, undefined, { cell: active });
  const commitCell = useCallback(
    (row: number, col: number, raw: string) => {
      collab.setCell(row, col, raw);
      bump();
    },
    [collab, bump],
  );

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
    collab.setColumnType(col, schema); // mirror to the shared doc when collaborating
    setColumnTypes((prev) => ({ ...prev, [col]: schema }));
  };

  // A rule is a formula predicate (uses `value`); blank clears it.
  const applyRule = (predicate: string, set: (rule: string | null) => void) => {
    set(predicate.trim() === '' ? null : predicate);
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
      registerCommand({
        id: 'sheet.collaborate',
        title: 'Collaborate',
        group: 'Collaborate',
        run: () => setPanel('collab'),
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
          <Button
            variant="ghost"
            onClick={() => setPanel((current) => (current === 'collab' ? 'none' : 'collab'))}
          >
            Collaborate
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
        <NameBox
          engine={engine}
          active={active}
          onDefineName={(name, row, col) => {
            collab.defineName(name, row, col);
            bump();
          }}
        />
        <FormulaBar
          engine={engine}
          active={active}
          onCommit={(value) => commitCell(active.row, active.col, value)}
        />
      </div>
      {panel === 'collab' ? (
        <CollabPanel
          active={collab.active}
          code={collab.code}
          onStart={collab.start}
          onJoin={collab.join}
          onLeave={collab.leave}
          peers={peers}
        />
      ) : null}
      {panel === 'column' ? (
        <ColumnInspector col={active.col} schema={columnTypes[active.col]} onChange={setColumnType} />
      ) : null}
      {panel === 'links' ? <LinkAuditor engine={engine} revision={revision} /> : null}
      {panel === 'chart' ? (
        <ChartDialog
          engine={engine}
          onApply={(next) => {
            collab.setChart(next); // mirror to the shared doc when collaborating
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
            peers={peers}
          />
        </div>
        <AiSidebar open={ai.isOpen} onClose={ai.close} app="sheet">
          <AiSettings settings={aiSettings} onChange={setAiSettings} />
          <AiActionPanel
            actions={sheetActions({
              engine,
              active,
              onInsertFormula: (formula) => commitCell(active.row, active.col, formula),
            })}
            provider={aiProvider}
          />
        </AiSidebar>
      </div>
      <CommandPalette isOpen={palette.isOpen} onClose={palette.close} context={{ app: 'sheet' }} />
    </div>
  );
}
