import styles from './shared.module.css';

export function Button({ children, variant = 'primary', loading = false, disabled = false, fullWidth = false, ...props }) {
  return (
    <button
      className={[
        styles.button,
        styles[variant],
        fullWidth ? styles.fullWidth : '',
        loading ? styles.loading : '',
      ].join(' ')}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <span className={styles.btnSpinner} /> : children}
    </button>
  );
}
