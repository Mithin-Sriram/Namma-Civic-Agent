"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MessageSquare, Pencil, Trash2, Check, X, MoreVertical, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChatOperations } from "@/hooks";

interface Chat {
  id: string;
  title: string;
  updatedAt: Date;
}

interface ChatsSidebarProps {
  chats: Chat[];
}

export function ChatsSidebar({ chats }: ChatsSidebarProps) {
  const pathname = usePathname();
  const { createChat, updateChat, deleteChat, isLoading } = useChatOperations();
  const [localChats, setLocalChats] = useState<Chat[]>(chats);
  const [hoveredChat, setHoveredChat] = useState<string | null>(null);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<Chat | null>(null);

  useEffect(() => {
    setLocalChats(chats);
  }, [chats]);

  const handleNewChat = async () => {
    await createChat();
  };

  const handleRenameClick = (chat: Chat, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingChatId(chat.id);
    setEditingTitle(chat.title);
  };

  const handleInlineRenameSave = async (chatId: string) => {
    if (!editingTitle.trim()) {
      setEditingChatId(null);
      return;
    }

    const result = await updateChat(chatId, editingTitle);
    if (result.success) {
      setEditingChatId(null);
      setEditingTitle("");
    } else {
      alert(`Failed to rename chat: ${result.error || "Please try again."}`);
    }
  };

  const handleInlineRenameCancel = () => {
    setEditingChatId(null);
    setEditingTitle("");
  };

  const handleDeleteClick = (chat: Chat) => {
    setChatToDelete(chat);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!chatToDelete) return;

    setLocalChats(prev => prev.filter(chat => chat.id !== chatToDelete.id));
    setDeleteDialogOpen(false);
    const chatIdToDelete = chatToDelete.id;
    setChatToDelete(null);

    const result = await deleteChat(chatToDelete);
    if (!result.success) {
      setLocalChats(chats);
      alert(`Failed to delete chat: ${result.error || "Please try again."}`);
    }
  };

  return (
    <div className="flex h-full w-14 shrink-0 flex-col border-r border-border bg-sidebar sm:w-64">
      <div className="px-1.5 pt-4 pb-3 sm:px-3">
        <button
          onClick={handleNewChat}
          disabled={isLoading}
          className={cn(
            "w-full flex items-center justify-center gap-2 rounded-lg px-0 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent/50 cursor-pointer sm:justify-start sm:px-3",
            isLoading && "opacity-50 cursor-not-allowed"
          )}
          aria-label="New chat"
          title="New chat"
        >
          <Pencil className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">New chat</span>
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {localChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="p-4 rounded-full bg-muted/50 mb-3">
              <MessageSquare className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">
              No chats yet
            </p>
            <p className="text-xs text-muted-foreground">
              Start a new conversation!
            </p>
          </div>
        ) : (
          <div className="px-1.5 pt-4 pb-2 sm:px-3">
            <h3 className="mb-3 hidden px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:block">Your chats</h3>
            <div className="space-y-1">
            {localChats.map((chat) => {
              const isActive = pathname === `/chats/${chat.id}`;
              const isHovered = hoveredChat === chat.id;
              return (
                <div
                  key={chat.id}
                  className={cn(
                    "group relative flex items-center gap-2 rounded-lg transition-all w-full",
                    isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
                    isHovered && !isActive && "bg-sidebar-accent/50"
                  )}
                  onMouseEnter={() => setHoveredChat(chat.id)}
                  onMouseLeave={() => {
                    if (editingChatId !== chat.id) {
                      setHoveredChat(null);
                    }
                  }}
                >
                  {editingChatId === chat.id ? (
                    <div className="flex items-center gap-2 flex-1 px-3 py-2">
                      <Input
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && editingTitle.trim() && !isLoading) {
                            e.preventDefault();
                            handleInlineRenameSave(chat.id);
                          } else if (e.key === "Escape" && !isLoading) {
                            e.preventDefault();
                            handleInlineRenameCancel();
                          }
                        }}
                        className="h-7 text-sm flex-1"
                        autoFocus
                        disabled={isLoading}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleInlineRenameSave(chat.id)}
                        disabled={isLoading || !editingTitle.trim()}
                        title="Save"
                        type="button"
                        aria-label="Save rename"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={handleInlineRenameCancel}
                        disabled={isLoading}
                        title="Cancel"
                        type="button"
                        aria-label="Cancel rename"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-1 min-w-0 w-full">
                      <Link
                        href={`/chats/${chat.id}`}
                        className={cn(
                          "flex flex-1 min-w-0 items-center justify-center gap-0 rounded-lg px-2 py-2 text-sm transition-colors cursor-pointer sm:justify-start sm:gap-3 sm:px-3",
                          isActive 
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
                            : "hover:bg-sidebar-accent/50"
                        )}
                        title={chat.title}
                        aria-label={chat.title}
                      >
                        <MessageSquare className={cn(
                          "h-4 w-4 shrink-0",
                          isActive && "text-sidebar-accent-foreground"
                        )} />
                        <span className={cn(
                          "hidden truncate sm:inline sm:flex-1",
                          isActive && "font-medium"
                        )}>{chat.title}</span>
                      </Link>
                      <div 
                        className={cn(
                          "hidden pr-2 transition-opacity duration-150 shrink-0 sm:block",
                          isHovered ? "opacity-100" : "opacity-0"
                        )}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              title="More options"
                              type="button"
                              disabled={isLoading}
                              aria-label="More options"
                            >
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (!isLoading) {
                                  handleRenameClick(chat, e);
                                }
                              }}
                              disabled={isLoading}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              <span>Rename</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (!isLoading) {
                                  handleDeleteClick(chat);
                                }
                              }}
                              className="text-destructive focus:text-destructive"
                              disabled={isLoading}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Delete</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            </div>
          </div>
        )}
      </div>

      <div className="flex h-14 items-center justify-center border-t border-border/50 bg-sidebar/50 px-1 sm:justify-between sm:px-3">
        <div className="hidden min-w-0 flex-1 flex-col justify-center sm:flex">
          <p className="text-sm font-semibold text-sidebar-foreground truncate leading-tight">
            Local User
          </p>
          <p className="text-xs text-muted-foreground truncate leading-tight mt-0.5">
            local@namma-civic-agent.local
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-9 w-9",
            pathname === "/settings" && "bg-sidebar-accent text-sidebar-accent-foreground"
          )}
          asChild
        >
          <Link href="/settings" title="Settings">
            <Settings className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <Dialog 
        open={deleteDialogOpen} 
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) {
            setChatToDelete(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete chat?</DialogTitle>
            <DialogDescription className="pt-2">
              This will delete <strong>{chatToDelete?.title}</strong>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isLoading}
            >
              {isLoading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
