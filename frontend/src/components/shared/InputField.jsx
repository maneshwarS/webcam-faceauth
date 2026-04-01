import styles from './shared.module.css';

export function InputField({ label, error, id, ...props }) {
  return (
    <div className={styles.fieldGroup}>
      {label && <label className={styles.label} htmlFor={id}>{label}</label>}
      <input id={id} className={`${styles.input} ${error ? styles.inputError : ''}`} {...props} />
      {error && <span className={styles.errorText}>{error}</span>}
    </div>
  );
}
