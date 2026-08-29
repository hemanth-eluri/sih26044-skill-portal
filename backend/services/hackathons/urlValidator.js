function sanitizeHttpUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(String(value));
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    url.username = '';
    url.password = '';
    return url.toString();
  } catch {
    return null;
  }
}

module.exports = { sanitizeHttpUrl };
