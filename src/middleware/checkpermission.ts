// import { Request, Response, NextFunction } from 'express';
// import { userRepository } from "@/api/user/userRepository";
// import { verifyJwt } from "../services/jwtService";

// interface JwtPayload {
//   id: string; 
// }

// interface Roles {
//   id: string;
//   name: string;
//   permissions: Permissions[]; // Mỗi vai trò có một danh sách quyền
// }

// interface Permissions {
//   id: string;
//   action: string;
// }

// // Thay đổi để nhận mảng quyền
// export const canAccessBy = (requiredPermissions: string[]) => {
//   return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
//     const authHeader = req.headers['authorization'];

//     if (!authHeader) {
//       res.status(401).json({ message: 'Unauthorized: No token provided' });
//       return;
//     }

//     const token = authHeader.split(' ')[1];

//     try {
//       const decoded = verifyJwt(token) as JwtPayload;
//       const user = await userRepository.findByIdWithRolesAndPermissions(decoded.id);
//       console.log(user)

//       // Kiểm tra xem user có tồn tại và có roles với permissions không
//       if (!user || !user.roles || !user.roles.some((role: Roles) => role.permissions.length > 0)) {
//         res.status(403).json({ message: 'Forbidden: No permissions found' });
//         return;
//       }

//       // if(!user || !user.role || user.role.permissions.length === 0) {
//       //   res.status(403).json({ message: 'Forbidden: No permissions found' });
//       //   return;
//       // }

//       // Lấy danh sách các quyền của user từ các vai trò
//       const userPermissions = user.roles.flatMap((role: Roles) =>
//         role.permissions.map((permission: Permissions) => permission.action)
//       );

//       // const userPermissions = user.role.permissions.map((permission: Permissions) => permission.action);


//       console.log(user.roles)
//       console.log(userPermissions)
//       // Kiểm tra nếu user có ít nhất một quyền trong requiredPermissions
//       const hasPermission = requiredPermissions.some(permission => userPermissions.includes(permission));


//       if (!hasPermission) {
//         res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
//         return;
//       }

//       next();
//     } catch (error) {
//       console.error("Error during permission check: ", error);
//       res.status(401).json({ message: 'Unauthorized: Invalid token or server error' });
//       return;
//     }
//   };
// };
