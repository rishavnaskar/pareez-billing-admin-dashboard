import {
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  type User,
} from "firebase/auth";
import { auth } from "./firebase";
import type { UserProfile, UserRole } from "./types";

export async function loginWithEmail(email: string, password: string): Promise<UserProfile> {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return profileFromUser(cred.user);
}

export async function logout(): Promise<void> {
  await fbSignOut(auth);
}

export async function profileFromUser(user: User): Promise<UserProfile> {
  // force refresh so freshly-set custom claims are picked up
  const tokenResult = await user.getIdTokenResult();
  const role = (tokenResult.claims.role as UserRole) ?? "user";
  const branchId = tokenResult.claims.branchId as string | undefined;
  return {
    uid: user.uid,
    email: user.email ?? "",
    displayName: user.displayName ?? undefined,
    role,
    branchId,
  };
}
