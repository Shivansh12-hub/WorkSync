const isString = (value) => typeof value === "string";

const sanitizeName = (value) =>
  value
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();

const sanitizeEmail = (value) => value.trim().toLowerCase();

const hasLeadingOrTrailingSpace = (value) => value !== value.trim();

const isValidEmail = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const isValidPassword = (value) => {
  if (value.length < 8 || value.length > 72) {
    return false;
  }

  const hasUpper = /[A-Z]/.test(value);
  const hasLower = /[a-z]/.test(value);
  const hasNumber = /\d/.test(value);
  const hasSymbol = /[^A-Za-z0-9]/.test(value);

  return hasUpper && hasLower && hasNumber && hasSymbol;
};

export const validateAndSanitizeRegister = (req, res, next) => {
  const { name, email, password, role } = req.body || {};

  if (!isString(name) || !isString(email) || !isString(password)) {
    return res.status(400).json({
      message: "Name, email, and password are required",
    });
  }

  const sanitizedName = sanitizeName(name);
  const sanitizedEmail = sanitizeEmail(email);
  const normalizedRole = isString(role) ? role.trim().toUpperCase() : "EMPLOYEE";

  if (sanitizedName.length < 2 || sanitizedName.length > 80) {
    return res.status(400).json({
      message: "Name must be between 2 and 80 characters",
    });
  }

  if (!isValidEmail(sanitizedEmail)) {
    return res.status(400).json({
      message: "Invalid email format",
    });
  }

  if (hasLeadingOrTrailingSpace(password)) {
    return res.status(400).json({
      message: "Password cannot start or end with spaces",
    });
  }

  if (!isValidPassword(password)) {
    return res.status(400).json({
      message:
        "Password must be 8-72 characters and include uppercase, lowercase, number, and special character",
    });
  }

  if (role !== undefined && normalizedRole !== "EMPLOYEE") {
    return res.status(400).json({
      message: "Public registration can only create employee accounts",
    });
  }

  req.authPayload = {
    name: sanitizedName,
    email: sanitizedEmail,
    password,
    role: "EMPLOYEE",
  };

  next();
};

export const validateAndSanitizeLogin = (req, res, next) => {
  const { email, password } = req.body || {};

  if (!isString(email) || !isString(password)) {
    return res.status(400).json({
      message: "Email and password are required",
    });
  }

  const sanitizedEmail = sanitizeEmail(email);

  if (!isValidEmail(sanitizedEmail)) {
    return res.status(400).json({
      message: "Invalid email format",
    });
  }

  if (password.length < 8 || password.length > 72) {
    return res.status(400).json({
      message: "Invalid email or password",
    });
  }

  req.authPayload = {
    email: sanitizedEmail,
    password,
  };

  next();
};
