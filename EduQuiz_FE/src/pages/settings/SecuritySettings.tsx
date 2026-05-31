import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuthStore } from "../../store/authStore";
import { settingsApi } from "../../api/settings";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { toast } from "sonner";
import { Loader2, ShieldCheck, AlertTriangle } from "lucide-react";

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[0-9]/, "Must contain at least one number"),
  confirmPassword: z.string().min(1, "Confirm password is required"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const setPasswordSchema = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[0-9]/, "Must contain at least one number"),
  confirmPassword: z.string().min(1, "Confirm password is required"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type PasswordFormValues = z.infer<typeof passwordSchema>;
type SetPasswordFormValues = z.infer<typeof setPasswordSchema>;

export default function SecuritySettings() {
  const { user, login } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const hasPassword = user?.hasPassword;

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
  });

  const setPasswordForm = useForm<SetPasswordFormValues>({
    resolver: zodResolver(setPasswordSchema),
  });

  const onChangePassword = async (data: PasswordFormValues) => {
    setLoading(true);
    try {
      await settingsApi.changePassword(data.currentPassword, data.newPassword);
      toast.success("Password changed successfully");
      passwordForm.reset();
    } catch (error) {
      toast.error("Failed to change password. Please check your current password.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const onSetPassword = async (data: SetPasswordFormValues) => {
    setLoading(true);
    try {
      await settingsApi.setPassword(data.newPassword);
      toast.success("Password set successfully");
      setPasswordForm.reset();
      // Update user state to reflect hasPassword = true
      if (user) {
        login({ ...user, hasPassword: true });
      }
    } catch (error) {
      toast.error("Failed to set password");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>
            Manage your password settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasPassword ? (
            <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input 
                  id="current-password" 
                  type="password" 
                  {...passwordForm.register("currentPassword")} 
                />
                {passwordForm.formState.errors.currentPassword && (
                  <p className="text-sm text-destructive">{passwordForm.formState.errors.currentPassword.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input 
                  id="new-password" 
                  type="password" 
                  {...passwordForm.register("newPassword")} 
                />
                {passwordForm.formState.errors.newPassword && (
                  <p className="text-sm text-destructive">{passwordForm.formState.errors.newPassword.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input 
                  id="confirm-password" 
                  type="password" 
                  {...passwordForm.register("confirmPassword")} 
                />
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-destructive">{passwordForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>

              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Change Password
              </Button>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      This account does not have a password yet. Set one to enable username login.
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={setPasswordForm.handleSubmit(onSetPassword)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="set-new-password">New Password</Label>
                  <Input 
                    id="set-new-password" 
                    type="password" 
                    {...setPasswordForm.register("newPassword")} 
                  />
                  {setPasswordForm.formState.errors.newPassword && (
                    <p className="text-sm text-destructive">{setPasswordForm.formState.errors.newPassword.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="set-confirm-password">Confirm Password</Label>
                  <Input 
                    id="set-confirm-password" 
                    type="password" 
                    {...setPasswordForm.register("confirmPassword")} 
                  />
                  {setPasswordForm.formState.errors.confirmPassword && (
                    <p className="text-sm text-destructive">{setPasswordForm.formState.errors.confirmPassword.message}</p>
                  )}
                </div>

                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Set Password
                </Button>
              </form>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Two-Factor Authentication</CardTitle>
          <CardDescription>
            Add an extra layer of security to your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">Two-factor authentication is currently disabled.</p>
              <p className="text-sm text-muted-foreground">
                Protect your account with an authenticator app.
              </p>
            </div>
            <Button variant="outline" disabled>Enable 2FA (Coming Soon)</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
