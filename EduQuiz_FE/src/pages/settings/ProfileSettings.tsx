import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { settingsApi } from "../../api/settings";
import { useAuthStore } from "../../store/authStore";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can contain only letters, numbers, and underscores"),
  bio: z.string().max(160, "Bio must be at most 160 characters").optional(),
  location: z.string().max(50, "Location must be at most 50 characters").optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfileSettings() {
  const { user, login } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || "",
      username: user?.username || "",
      bio: user?.bio || "",
      location: user?.location || "",
    },
  });

  if (!user) {
    return null;
  }

  const onSubmit = async (data: ProfileFormValues) => {
    setLoading(true);

    try {
      const updatedUser = await settingsApi.updateProfile(user, data);
      login(updatedUser);
      form.reset(data);
      toast.success("Profile updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Manage your public account information.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="flex items-center gap-4 rounded-lg border bg-muted/20 p-4">
              <Avatar className="h-20 w-20 border">
                <AvatarImage src={user.avatarUrl} alt={user.name} />
                <AvatarFallback className="text-xl">{user.name.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <p className="font-medium">{user.name}</p>
                <p className="text-sm text-muted-foreground">@{user.username}</p>
                <p className="text-xs text-muted-foreground">
                  Avatar upload will be added when backend storage is available.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Display name</Label>
                <Input id="name" {...form.register("name")} />
                {form.formState.errors.name ? (
                  <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" {...form.register("username")} />
                {form.formState.errors.username ? (
                  <p className="text-sm text-destructive">{form.formState.errors.username.message}</p>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                placeholder="Short introduction"
                className="resize-none"
                {...form.register("bio")}
              />
              <p className="text-right text-xs text-muted-foreground">
                {form.watch("bio")?.length || 0}/160
              </p>
              {form.formState.errors.bio ? (
                <p className="text-sm text-destructive">{form.formState.errors.bio.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" {...form.register("location")} />
              {form.formState.errors.location ? (
                <p className="text-sm text-destructive">{form.formState.errors.location.message}</p>
              ) : null}
            </div>

            <Button type="submit" disabled={loading || !form.formState.isDirty}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save changes
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
