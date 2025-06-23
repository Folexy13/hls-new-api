export const signInDTO = {
  email: {
    type: "string",
    format: "email",
    example: "user@example.com",
  },
  password: {
    type: "string",
    minLength: 6,
    example: "password123",
  },
};

export const signUpDTO = {
  name: {
    type: "string",
    minLength: 1,
    example: "John Doe",
  },
  email: {
    type: "string",
    format: "email",
    example: "john@example.com",
  },
  password: {
    type: "string",
    minLength: 6,
    example: "password123",
  },
};

export const forgotPasswordDTO = {
  email: {
    type: "string",
    format: "email",
    example: "john@example.com",
  },
};

export const resetPasswordDTO = {
  otp: {
    type: "string",
    example: "123456",
  },
  password: {
    type: "string",
    minLength: 6,
    example: "newpassword123",
  },
};
export const changePasswordDTO = {
  oldPassword: {
    type: "string",
    minLength: 6,
    example: "oldpassword123",
  },
  newPassword: {
    type: "string",
    minLength: 6,
    example: "newpassword123",
  },
};
