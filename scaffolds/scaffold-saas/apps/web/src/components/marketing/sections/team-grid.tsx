import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export interface TeamMember {
  name: string;
  role: string;
  bio: string;
  avatar?: string | null;
}

export interface TeamGridProps {
  /** Title for the section */
  title?: string;
  /** Description for the section */
  description?: string;
  /** Array of team members to display */
  members: TeamMember[];
  /** Custom className */
  className?: string;
}

/**
 * TeamGrid component for displaying team members.
 *
 * @example
 * ```tsx
 * <TeamGrid
 *   title="Meet the Team"
 *   description="The people behind the product"
 *   members={[
 *     { name: "John Doe", role: "CEO", bio: "Leading the vision...", avatar: "/avatars/john.jpg" },
 *   ]}
 * />
 * ```
 */
export function TeamGrid({
  title = "Meet the Team",
  description = "The people behind the scaffold",
  members,
  className,
}: TeamGridProps) {
  if (!members.length) return null;

  return (
    <div className={className ?? "mb-24"}>
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-4">{title}</h2>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <div className="grid gap-8 md:grid-cols-3 max-w-4xl mx-auto">
        {members.map((member, index) => (
          <Card key={index} className="text-center">
            <CardHeader>
              <Avatar className="h-20 w-20 mx-auto mb-4">
                <AvatarImage src={member.avatar || undefined} />
                <AvatarFallback className="text-xl">
                  {member.name.split(" ").map(n => n[0]).join("")}
                </AvatarFallback>
              </Avatar>
              <CardTitle>{member.name}</CardTitle>
              <p className="text-sm text-primary">{member.role}</p>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{member.bio}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
