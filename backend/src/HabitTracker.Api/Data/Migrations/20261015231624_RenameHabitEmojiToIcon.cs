using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HabitTracker.Api.Data.Migrations
{
    /// <summary>
    /// Habits get a Lucide icon name ("book-open") instead of an emoji ("📚").
    ///
    /// Edited by hand: EF only sees "Emoji is gone, Icon is new" and scaffolded DropColumn + AddColumn,
    /// which would delete every habit's emoji. A rename keeps the data, and the UPDATE converts it.
    /// </summary>
    public partial class RenameHabitEmojiToIcon : Migration
    {
        // Emoji → icon name, for the emojis the old form offered plus a few common ones.
        private static readonly (string Emoji, string Icon)[] Map =
        [
            ("✅", "circle-check"), ("📚", "book-open"), ("📖", "book-open"), ("🏃", "footprints"),
            ("💧", "droplet"), ("🧘", "brain"), ("💪", "dumbbell"), ("🥗", "salad"), ("😴", "bed"),
            ("✍️", "pen-line"), ("🎸", "guitar"), ("🧹", "sparkles"), ("💊", "pill"), ("💻", "code"),
            ("🧩", "puzzle"), ("💰", "piggy-bank"), ("🥩", "beef"),
        ];

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(name: "Emoji", table: "Habits", newName: "Icon");

            migrationBuilder.AlterColumn<string>(
                name: "Icon",
                table: "Habits",
                type: "character varying(32)",
                maxLength: 32,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(16)",
                oldMaxLength: 16);

            // Known emojis become their icon; anything else (a custom emoji) gets the default.
            migrationBuilder.Sql($"""
                UPDATE "Habits" SET "Icon" = CASE "Icon"
                    {string.Join("\n        ", Map.Select(m => $"WHEN '{m.Emoji}' THEN '{m.Icon}'"))}
                    ELSE 'circle-check'
                END;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Back to emojis. The first emoji listed for an icon wins; unknown icons become ✅.
            var reverse = Map.GroupBy(m => m.Icon).Select(g => g.First());
            migrationBuilder.Sql($"""
                UPDATE "Habits" SET "Icon" = CASE "Icon"
                    {string.Join("\n        ", reverse.Select(m => $"WHEN '{m.Icon}' THEN '{m.Emoji}'"))}
                    ELSE '✅'
                END;
                """);

            migrationBuilder.AlterColumn<string>(
                name: "Icon",
                table: "Habits",
                type: "character varying(16)",
                maxLength: 16,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(32)",
                oldMaxLength: 32);

            migrationBuilder.RenameColumn(name: "Icon", table: "Habits", newName: "Emoji");
        }
    }
}
