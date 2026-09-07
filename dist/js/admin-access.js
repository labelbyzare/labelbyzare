/* LABEL BY ZARE — admin roles, section access, approval routing and write guards */
(function(){
  "use strict";
  const sections=["dashboard","analytics","products","orders","returns","customers","abandoned","reviews","messages","subscribers","discounts","approvals","activity","notifications","popup","settings","health"];
  const labels={analytics:"website analytics",products:"products",orders:"orders",returns:"returns and refunds",customers:"customer records",abandoned:"abandoned carts",reviews:"reviews",messages:"messages",subscribers:"subscribers",discounts:"discounts",approvals:"approval requests",activity:"activity log",notifications:"notifications",popup:"message popup",settings:"website settings",health:"system health",admins:"admin users"};
  const defaults=Object.fromEntries(sections.map(k=>[k,true]));
  let profile={email:"",full_name:"Admin",role:"owner",phone:"",notes:"",active:true,can_apply_changes:true,can_manage_admins:true,requires_approval:false,permissions:{...defaults},legacy:true};
  const roleLabel=role=>({owner:"Owner",managing_director:"Managing Director",admin:"Admin",viewer:"Viewer"}[role]||"Admin");
  function normalize(row={}){
    const role=["owner","managing_director","admin","viewer"].includes(row.role)?row.role:"owner";
    const raw=(row.permissions&&typeof row.permissions==="object")?row.permissions:{};
    const permissions={...defaults,...raw,dashboard:true};
    if(!Object.prototype.hasOwnProperty.call(raw,"analytics"))permissions.analytics=role!=="viewer";
    if(!Object.prototype.hasOwnProperty.call(raw,"abandoned"))permissions.abandoned=role!=="viewer";
    if(!Object.prototype.hasOwnProperty.call(raw,"health"))permissions.health=role==="owner"||role==="managing_director";
    return {
      email:String(row.email||""),full_name:String(row.full_name||"").trim()||String(row.email||"Admin"),role,
      phone:String(row.phone||""),notes:String(row.notes||""),active:row.active!==false,
      can_apply_changes:role==="owner"?true:(role==="viewer"?false:row.can_apply_changes!==false),
      can_manage_admins:role==="owner"?true:(role==="viewer"?false:row.can_manage_admins===true),
      requires_approval:role==="owner"||role==="viewer"?false:row.requires_approval===true,
      permissions:role==="owner"?{...defaults}:permissions,legacy:row.legacy===true,created_at:row.created_at||null,last_login_at:row.last_login_at||null
    };
  }
  function canView(section){if(section==="admins"||section==="dashboard")return true;if(profile.role==="owner")return true;return profile.permissions?.[section]!==false;}
  function canPrepare(section){if(!profile.active)return false;if(profile.role==="owner")return true;return profile.can_apply_changes===true&&canView(section);}
  function canWrite(section){if(!canPrepare(section))return false;if(profile.role==="owner")return true;return profile.requires_approval!==true;}
  function changeMode(section){if(!canPrepare(section))return "denied";return canWrite(section)?"direct":"approval";}
  function canManageAdmins(){return profile.role==="owner"||(profile.can_apply_changes===true&&profile.can_manage_admins===true&&profile.requires_approval!==true);}
  function canReviewApprovals(){return profile.role==="owner"||(profile.role==="managing_director"&&profile.can_apply_changes===true&&profile.requires_approval!==true&&canView("approvals"));}
  function requireWrite(section,action){if(canWrite(section))return true;const what=action||labels[section]||"this area";if(changeMode(section)==="approval")alert(`Approval required: your ${what} changes must be submitted for review. Saving from supported editors will create a pending approval request instead of publishing immediately.`);else alert(`View-only access: you don't have permission to change ${what}. Ask the Owner or Managing Director to enable “Apply changes” for your admin account.`);return false;}
  function requirePrepare(section,action){if(canPrepare(section))return true;const what=action||labels[section]||"this area";alert(`View-only access: you don't have permission to prepare ${what} changes.`);return false;}
  function requireManageAdmins(){if(canManageAdmins())return true;alert("You can view your own admin account, but you don't have permission to add or manage other admin users.");return false;}
  async function routeChange(section,actionType,title,payload={}){
    const mode=changeMode(section);
    if(mode==="denied"){requirePrepare(section,title||labels[section]);return{mode:"denied"};}
    if(mode==="direct")return{mode:"direct"};
    if(!window.supabaseClient){alert("Could not submit this approval request because the database client is unavailable.");return{mode:"error",error:new Error("Database client unavailable")};}
    try{
      const {data,error}=await window.supabaseClient.rpc("admin_submit_approval",{p_section:section,p_action_type:actionType,p_title:title,p_payload:payload});
      if(error)throw error;
      document.dispatchEvent(new CustomEvent("lz:approval-submitted",{detail:{section,actionType,title,id:data}}));
      return{mode:"queued",data};
    }catch(error){alert("Could not submit approval request: "+(error?.message||error));return{mode:"error",error};}
  }
  function applyUI(){
    document.body.dataset.adminRole=profile.role;document.body.dataset.approvalRequired=String(profile.requires_approval===true);document.body.classList.toggle("admin-readonly",!profile.can_apply_changes&&profile.role!=="owner");document.body.classList.toggle("admin-approval-mode",profile.requires_approval===true);
    document.querySelectorAll("[data-section-target]").forEach(btn=>{const section=btn.dataset.sectionTarget;btn.hidden=!canView(section);});
    document.querySelectorAll("[data-go-section]").forEach(btn=>{const section=btn.dataset.goSection;btn.hidden=!canView(section);});
    const bell=document.getElementById("admin-notification-bell");if(bell)bell.hidden=!canView("notifications");
    const name=document.getElementById("admin-current-name"),role=document.getElementById("admin-current-role"),mode=document.getElementById("admin-access-mode");
    if(name)name.textContent=profile.full_name||profile.email;if(role)role.textContent=roleLabel(profile.role);if(mode){const viewOnly=!profile.can_apply_changes&&profile.role!=="owner";mode.textContent=viewOnly?"View only":profile.requires_approval?"Approval mode":"Changes enabled";mode.classList.toggle("is-readonly",viewOnly);mode.classList.toggle("is-approval",profile.requires_approval===true);}
    const banner=document.getElementById("admin-readonly-banner");if(banner){banner.hidden=profile.role==="owner"||profile.can_apply_changes;}
    document.dispatchEvent(new CustomEvent("lz:admin-access-updated",{detail:profile}));
  }
  function setProfile(row){profile=normalize(row);window.LZ_ADMIN_USER=profile;applyUI();return profile;}
  window.LZAdminAccess={setProfile,get profile(){return profile;},canView,canPrepare,canWrite,changeMode,canManageAdmins,canReviewApprovals,requireWrite,requirePrepare,requireManageAdmins,routeChange,roleLabel,sections:[...sections],permissionDefaults:{...defaults},applyUI};
})();
