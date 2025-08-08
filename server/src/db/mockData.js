// Mock database untuk testing login
import bcrypt from "bcryptjs";

// Hash password admin123
const hashedPassword = await bcrypt.hash("admin123", 10);

export const mockUsers = [
  {
    _id: "admin001",
    username: "admin",
    password: hashedPassword,
    name: "Administrator",
    role: "admin",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Mock user methods
export const findUserByUsername = (username) => {
  return mockUsers.find((user) => user.username === username);
};

export const findUserById = (id) => {
  return mockUsers.find((user) => user._id === id);
};
