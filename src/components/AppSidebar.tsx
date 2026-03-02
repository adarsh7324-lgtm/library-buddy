import { NavLink } from '@/components/NavLink';
import { useLibrary } from '@/context/LibraryContext';
import { useNavigate } from 'react-router-dom';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';
import { LayoutDashboard, Users, UserPlus, IndianRupee, LogOut, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

const navItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Members', url: '/members', icon: Users },
  { title: 'Add Member', url: '/add-member', icon: UserPlus },
  { title: 'Payments', url: '/payments', icon: IndianRupee },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { logout } = useLibrary();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-sidebar-primary flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-3.5 h-3.5 text-sidebar-primary-foreground" />
              </div>
              {!collapsed && <span className="font-display font-bold text-sm text-sidebar-foreground">LibraryPro</span>}
            </div>
          </SidebarGroupLabel>
          <SidebarGroupContent className="mt-4">
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3">
        <Button variant="ghost" size={collapsed ? 'icon' : 'default'} onClick={handleLogout} className="w-full justify-start text-sidebar-foreground hover:text-destructive hover:bg-destructive/10">
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Logout</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
