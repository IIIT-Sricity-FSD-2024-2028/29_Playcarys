// Form validation rules, copied from the old `Validate` object in js/utils.js.
//
// validateField(value, rules) returns the first error message, or '' when the
// value passes every rule. Rules look like { type: 'minLen', n: 3, msg: '...' }.

function isRequired(val) {
  return val !== null && val !== undefined && String(val).trim() !== '';
}

function isEmail(val) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
}

function hasMinLen(val, n) {
  return String(val).trim().length >= n;
}

function hasMaxLen(val, n) {
  return String(val).trim().length <= n;
}

function isStrongPassword(val) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(val);
}

function isPhone(val) {
  return /^\+?[0-9]\d{6,14}$/.test(val.replace(/[\s-]/g, '').trim());
}

function isNumeric(val) {
  return !isNaN(parseFloat(val)) && isFinite(val);
}

function isPositive(val) {
  return parseFloat(val) > 0;
}

export function validateField(val, rules) {
  for (const rule of rules) {
    if (rule.type === 'required' && !isRequired(val)) {
      return rule.msg || 'This field is required';
    }
    if (rule.type === 'email' && val && !isEmail(val)) {
      return rule.msg || 'Enter a valid email address';
    }
    if (rule.type === 'minLen' && !hasMinLen(val, rule.n)) {
      return rule.msg || `Minimum ${rule.n} characters`;
    }
    if (rule.type === 'maxLen' && !hasMaxLen(val, rule.n)) {
      return rule.msg || `Maximum ${rule.n} characters`;
    }
    if (rule.type === 'password' && val && !isStrongPassword(val)) {
      return rule.msg || 'Password must be 8+ chars with uppercase, lowercase and number';
    }
    if (rule.type === 'match' && val !== rule.targetValue) {
      return rule.msg || 'Fields do not match';
    }
    if (rule.type === 'phone' && val && !isPhone(val)) {
      return rule.msg || 'Enter a valid mobile number with country code';
    }
    if (rule.type === 'numeric' && val && !isNumeric(val)) {
      return rule.msg || 'Must be a number';
    }
    if (rule.type === 'positive' && val && !isPositive(val)) {
      return rule.msg || 'Must be a positive number';
    }
    if (rule.type === 'custom' && !rule.fn(val)) {
      return rule.msg || 'Invalid value';
    }
  }
  return '';
}
