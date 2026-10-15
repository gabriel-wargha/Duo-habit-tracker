using HabitTracker.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace HabitTracker.Api.Data;

// The bridge between our C# classes and the database.
// Each DbSet<T> is a table; querying it with LINQ becomes SQL.
public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Habit> Habits => Set<Habit>();
    public DbSet<HabitMember> HabitMembers => Set<HabitMember>();
    public DbSet<CheckIn> CheckIns => Set<CheckIn>();
    public DbSet<Invite> Invites => Set<Invite>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(user =>
        {
            user.Property(u => u.Email).HasMaxLength(256);
            user.Property(u => u.DisplayName).HasMaxLength(100);
            user.Property(u => u.PasswordHash).HasMaxLength(500);

            // Two accounts can't share an email. (Block 3 lower-cases emails before saving.)
            user.HasIndex(u => u.Email).IsUnique();
        });

        modelBuilder.Entity<Habit>(habit =>
        {
            habit.Property(h => h.Name).HasMaxLength(100);
            habit.Property(h => h.Description).HasMaxLength(500);
            habit.Property(h => h.Icon).HasMaxLength(32);
            habit.Property(h => h.Color).HasMaxLength(7);
        });

        modelBuilder.Entity<HabitMember>(member =>
        {
            // Save the enum as readable text ("Owner") instead of a number (0).
            member.Property(m => m.Role).HasConversion<string>().HasMaxLength(20);

            // One-to-many on both sides: a habit has many members, a user has many memberships.
            // Cascade: deleting a habit (or user) deletes its membership rows too.
            member.HasOne(m => m.Habit)
                .WithMany(h => h.Members)
                .HasForeignKey(m => m.HabitId)
                .OnDelete(DeleteBehavior.Cascade);

            member.HasOne(m => m.User)
                .WithMany(u => u.Memberships)
                .HasForeignKey(m => m.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // A user can be a member of a given habit only once.
            member.HasIndex(m => new { m.HabitId, m.UserId }).IsUnique();
        });

        modelBuilder.Entity<CheckIn>(checkIn =>
        {
            checkIn.HasOne(c => c.Habit)
                .WithMany(h => h.CheckIns)
                .HasForeignKey(c => c.HabitId)
                .OnDelete(DeleteBehavior.Cascade);

            checkIn.HasOne(c => c.User)
                .WithMany(u => u.CheckIns)
                .HasForeignKey(c => c.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // One check-in per person per habit per day. The database enforces this,
            // so even two fast double-clicks can't create duplicates.
            checkIn.HasIndex(c => new { c.HabitId, c.UserId, c.Date }).IsUnique();
        });

        modelBuilder.Entity<Invite>(invite =>
        {
            invite.Property(i => i.Code).HasMaxLength(32);
            invite.HasIndex(i => i.Code).IsUnique();

            invite.HasOne(i => i.Habit)
                .WithMany(h => h.Invites)
                .HasForeignKey(i => i.HabitId)
                .OnDelete(DeleteBehavior.Cascade);

            // User has no list of invites, so WithMany() is empty.
            invite.HasOne(i => i.CreatedByUser)
                .WithMany()
                .HasForeignKey(i => i.CreatedByUserId)
                .OnDelete(DeleteBehavior.Cascade);

            // If the person who accepted is deleted, keep the invite but clear the link.
            invite.HasOne(i => i.AcceptedByUser)
                .WithMany()
                .HasForeignKey(i => i.AcceptedByUserId)
                .OnDelete(DeleteBehavior.SetNull);
        });
    }
}
