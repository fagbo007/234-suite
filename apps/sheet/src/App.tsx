import { SheetEngine } from '@234/formula-engine';
import {
  Button,
  CommandPalette,
  registerCommand,
  toggleTheme,
  useCommandPalette,
} from '@234/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './App.module.css';
import { FormulaBar } from './grid/FormulaBar';
import { Grid } from './grid/Grid';
import { NameBox } from './grid/NameBox';

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
  const bump = useCallback(() => setRevision((value) => value + 1), []);

  const activeRef = useRef(active);
  activeRef.current = active;

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
  }, [engine, bump]);

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>234 Sheet</h1>
        <Button variant="secondary" onClick={palette.open}>
          Command palette
        </Button>
      </header>
      <div className={styles.formulaRow}>
        <NameBox engine={engine} active={active} onCommit={bump} />
        <FormulaBar engine={engine} active={active} onCommit={bump} />
      </div>
      <Grid
        engine={engine}
        active={active}
        onSelect={(row, col) => setActive({ row, col })}
        revision={revision}
      />
      <CommandPalette isOpen={palette.isOpen} onClose={palette.close} context={{ app: 'sheet' }} />
    </div>
  );
}
