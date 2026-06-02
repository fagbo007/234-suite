import { type InputHTMLAttributes, forwardRef, useId } from 'react';
import { Icon, type IconProps } from '../Icon';
import styles from './Input.module.css';

type BaseProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'aria-label'>;

// Accessibility is enforced at the type level: an Input must have either a
// visible `label` or an `aria-label` (root CLAUDE.md Section 5, Section 12).
type LabelledProps =
  | { label: string; 'aria-label'?: never }
  | { label?: undefined; 'aria-label': string };

export type InputProps = BaseProps &
  LabelledProps & {
    /** Optional leading Tabler outline icon. */
    leadingIcon?: IconProps['icon'];
  };

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, leadingIcon, id, className, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const inputClasses = [styles.input, leadingIcon ? styles.hasIcon : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={styles.field}>
      {label ? (
        <label className={styles.label} htmlFor={inputId}>
          {label}
        </label>
      ) : null}
      <div className={styles.control}>
        {leadingIcon ? (
          <Icon icon={leadingIcon} size="body" className={styles.icon} />
        ) : null}
        <input ref={ref} id={inputId} className={inputClasses} {...rest} />
      </div>
    </div>
  );
});
