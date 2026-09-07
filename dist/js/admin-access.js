/* LABEL BY ZARE — admin roles, section access and write guards */
(function(){
  "use strict";
  const sections=["dashboard","products","orders","customers","reviews","messages","subscribers","discounts","popup","settings"];
  const labels={products:"products",orders:"orders",customers:"customer records",reviews:"reviews",messages:"messages",subscribers:"subscribers",discounts:"discounts",popup:"message popup",settings:"website settings",admins:"admin users"};
  const defaults=Object.fromEntries(sections.map(k=>[k,true]));
  let profile={email:"",full_name:"Admin",role:"owner",phone:"",notes:"",active:true,can_apply_changes:true,can_manage_admins:true,permissions:{...defaults},legacy:true};
  const roleLabel=role=>({owner:"Owner",managing_director:"Managing Director",admin:"Admin",viewer:"Viewer"}[role]||"Admin");
  function normalize(row={}){
    const role=["owner","managing_director","admin","viewer"].includes(row.role)?row.role:"owner";
    const raw=(row.permissions&&typeof row.permissions==="object")?row.permissions:{};
    const permissions={...defaults,...raw,dashboard:true};
    return {
      email:String(row.email||""),full_name:String(row.full_name||"").trim()||String(row.email||"Admin"),role,
      phone:String(row.phone||""),notes:String(row.notes||""),active:row.active!==false,
      can_apply_changes:role==="owner"?true:(role==="viewer"?false:row.can_apply_changes!==false),
      can_manage_admins:role==="owner"?true:(role==="viewer"?false:row.can_manage_admins===true),
      permissions:role==="owner"?{...defaults}:permissions,legacy:row.legacy===true,created_at:row.created_at||null,last_login_at:row.last_login_at||null
    };
  }
  function canView(section){if(section==="admins"||section==="dashboard")return true;if(profile.role==="owner")return true;return profile.permissions?.[section]!==false;}
  function canWrite(section){if(!profile.active)return false;if(profile.role==="owner")return true;return profile.can_apply_changes===true&&canView(section);}
  function canManageAdmins(){return profile.role==="owner"||(profile.can_apply_changes===true&&profile.can_manage_admins===true);}
  function requireWrite(section,action){if(canWrite(section))return true;const what=action||labels[section]||"this area";alert(`View-only access: you don't have permission to change ${what}. Ask the Owner or Managing Director to enable “Apply changes” for your admin account.`);return false;}
  function requireManageAdmins(){if(canManageAdmins())return true;alert("You can view your own admin account, but you don't have permission to add or manage other admin users.");return false;}
  function applyUI(){
    document.body.dataset.adminRole=profile.role;document.body.classList.toggle("admin-readonly",!profile.can_apply_changes&&profile.role!=="owner");
    document.querySelectorAll("[data-section-target]").forEach(btn=>{const section=btn.dataset.sectionTarget;btn.hidden=!canView(section);});
    const name=document.getElementById("admin-current-name"),role=document.getElementById("admin-current-role"),mode=document.getElementById("admin-access-mode");
    if(name)name.textContent=profile.full_name||profile.email;if(role)role.textContent=roleLabel(profile.role);if(mode){const write=profile.role==="owner"||profile.can_apply_changes;mode.textContent=write?"Changes enabled":"View only";mode.classList.toggle("is-readonly",!write);}
    const banner=document.getElementById("admin-readonly-banner");if(banner)banner.hidden=profile.role==="owner"||profile.can_apply_changes;
    document.dispatchEvent(new CustomEvent("lz:admin-access-updated",{detail:profile}));
  }
  function setProfile(row){profile=normalize(row);window.LZ_ADMIN_USER=profile;applyUI();return profile;}
  window.LZAdminAccess={setProfile,get profile(){return profile;},canView,canWrite,canManageAdmins,requireWrite,requireManageAdmins,roleLabel,sections:[...sections],permissionDefaults:{...defaults},applyUI};
})();
