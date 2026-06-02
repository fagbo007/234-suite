// Ambient declarations so TypeScript accepts CSS imports that Vite handles.
declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module '*.css';
