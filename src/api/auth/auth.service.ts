import bcrypt from "bcryptjs";

import { User } from "../../model/users.entity";
import { userRepository } from "../../repository/userRepository";
import {
  ServiceResponse,
  ResponseStatus,
} from "../../services/serviceResponse";
import { StatusCodes } from "http-status-codes";
import { generateJwt } from "../../services/jwtService";
import { Login, Token, AuthResponseData } from "../auth/auth.interface";
import { calculateUnixTime } from "../../services/caculateDatetime";
import mailService from "../../services/sendEmail";
import { verify } from "crypto";
import cache from "../../services/cache";

export const authService = {
  // Register new user
  register: async (userData: User): Promise<ServiceResponse<User | null>> => {
    try {
      const user = await userRepository.findByEmailAsync(userData.email);
      if (user) {
        return new ServiceResponse(
          ResponseStatus.Failed,
          "Email already exists",
          null,
          StatusCodes.BAD_REQUEST
        );
      }
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const newUser = await userRepository.createUserAsync({
        ...userData,
        password: hashedPassword,
      });
      if (!newUser) {
        return new ServiceResponse(
          ResponseStatus.Failed,
          "Error creating users",
          null,
          StatusCodes.INTERNAL_SERVER_ERROR
        );
      }

      return new ServiceResponse<User>(
        ResponseStatus.Success,
        "User registered successfully!",
        newUser,
        StatusCodes.CREATED
      );
    } catch (ex) {
      const errorMessage = `Error creating usersss: ${(ex as Error).message}`;
      return new ServiceResponse(
        ResponseStatus.Failed,
        errorMessage,
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  },

  // Login user
  login: async (
    loginData: Login
  ): Promise<ServiceResponse<AuthResponseData | null>> => {
    try {
      const user = await userRepository.findByEmailAsync(loginData.email);
      if (!user) {
        return new ServiceResponse(
          ResponseStatus.Failed,
          "User not found",
          null,
          StatusCodes.NOT_FOUND
        );
      }
      // Compare hashed password
      const passwordMatch = await bcrypt.compare(
        loginData.password,
        user.password
      ); // Compare entered password with hashed password
      if (!passwordMatch) {
        return new ServiceResponse(
          ResponseStatus.Failed,
          "Invalid password",
          null,
          StatusCodes.UNAUTHORIZED
        );
      }

      const token: Token = {
        accessToken: generateJwt({ userId: user.id }),
        refreshToken: generateJwt({ userId: user.id }),
        expiresIn: calculateUnixTime(process.env.JWT_EXPIRES_IN || "1h"),
        tokenType: "Bearer",
      };
      const data: AuthResponseData = {
        token: token,
        user: user,
      };

      return new ServiceResponse<AuthResponseData>(
        ResponseStatus.Success,
        "Login successful",
        data,
        StatusCodes.OK
      );
    } catch (ex) {
      const errorMessage = `Error logging in: ${(ex as Error).message}`;
      return new ServiceResponse(
        ResponseStatus.Failed,
        errorMessage,
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  },

  getUser: async (): Promise<ServiceResponse<User[] | null>> => {
    try {
      const cacheKey = `user-list`;

      const startTime = Date.now();

      let user = await cache.get<User[] | null>(cacheKey);

      if (!user) {
        user = await userRepository.findAllAsync();

        if (!user || user.length === 0) {
          return new ServiceResponse(
            ResponseStatus.Failed,
            "User not found",
            null,
            StatusCodes.NOT_FOUND
          );
        }

        await cache.set(cacheKey, user, 60000);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;
      console.log(`Thời gian xử lý: ${duration} ms`);

      return new ServiceResponse<User[]>(
        ResponseStatus.Success,
        "User found",
        user,
        StatusCodes.OK
      );
    } catch (ex) {
      const errorMessage = `Error getting user: ${(ex as Error).message}`;
      return new ServiceResponse(
        ResponseStatus.Failed,
        errorMessage,
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  },

  getUserById: async (
    userId: string
  ): Promise<ServiceResponse<User | null>> => {
    try {
      const user = await userRepository.findByIdAsync(userId);
      if (!user) {
        return new ServiceResponse(
          ResponseStatus.Failed,
          "User not found by ID",
          null,
          StatusCodes.NOT_FOUND
        );
      }
      return new ServiceResponse<User>(
        ResponseStatus.Success,
        "User found by ID",
        user,
        StatusCodes.OK
      );
    } catch (ex) {
      const errorMessage = `Error getting user by ID: ${(ex as Error).message}`;
      return new ServiceResponse(
        ResponseStatus.Failed,
        errorMessage,
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  },

  

  updateUser: async (
    userId: string,
    userData: Partial<User>
  ): Promise<ServiceResponse<User | null>> => {
    try {
      const user = await userRepository.findByIdAsync(userId);
      if (!user) {
        return new ServiceResponse(
          ResponseStatus.Failed,
          "User not found",
          null,
          StatusCodes.NOT_FOUND
        );
      }

      const updatedUser = await userRepository.updateUserAsync(
        userId,
        userData
      );
      if (!updatedUser) {
        return new ServiceResponse(
          ResponseStatus.Failed,
          "Error updating user",
          null,
          StatusCodes.INTERNAL_SERVER_ERROR
        );
      }

      return new ServiceResponse<User>(
        ResponseStatus.Success,
        "User updated successfully",
        updatedUser,
        StatusCodes.OK
      );
    } catch (ex) {
      const errorMessage = `Error updating user: ${(ex as Error).message}`;
      return new ServiceResponse(
        ResponseStatus.Failed,
        errorMessage,
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  },
};
