-- CreateTable
CREATE TABLE "AssetAssignmentHistory" (
    "Id" SERIAL NOT NULL,
    "AssetId" INTEGER NOT NULL,
    "Type" TEXT NOT NULL,
    "AssignedTo" TEXT NOT NULL,
    "Department" TEXT NOT NULL,
    "Location" TEXT NOT NULL,
    "AssignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ReturnedAt" TIMESTAMP(3),
    "Note" TEXT,
    "AssignedById" INTEGER,
    "AssignedByName" TEXT NOT NULL,
    "FromAssignedTo" TEXT,
    "FromDepartment" TEXT,
    "FromLocation" TEXT,

    CONSTRAINT "AssetAssignmentHistory_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "Assets" (
    "Id" SERIAL NOT NULL,
    "AssetCode" TEXT NOT NULL,
    "Name" TEXT NOT NULL,
    "Category" TEXT NOT NULL,
    "Subcategory" TEXT NOT NULL,
    "BrandModel" TEXT NOT NULL,
    "Vendor" TEXT NOT NULL,
    "PurchaseDate" DATE NOT NULL,
    "PurchaseCost" DECIMAL(18,2) NOT NULL,
    "ExpiryDate" DATE NOT NULL,
    "WarrantyExpiry" DATE NOT NULL,
    "AssignedTo" TEXT,
    "Department" TEXT NOT NULL,
    "Location" TEXT NOT NULL,
    "Status" TEXT NOT NULL,
    "Notes" TEXT,
    "CreatedById" INTEGER,
    "UpdatedById" INTEGER,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Assets_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "Categories" (
    "Id" SERIAL NOT NULL,
    "Name" TEXT NOT NULL,
    "Description" TEXT,
    "DefaultAssigneeId" INTEGER,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Categories_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "Companies" (
    "Id" SERIAL NOT NULL,
    "Name" TEXT NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Companies_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "Departments" (
    "Id" SERIAL NOT NULL,
    "Name" TEXT NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Departments_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "Notifications" (
    "Id" SERIAL NOT NULL,
    "UserId" INTEGER NOT NULL,
    "TicketId" INTEGER,
    "Title" TEXT NOT NULL,
    "Message" TEXT NOT NULL,
    "IsRead" BOOLEAN NOT NULL DEFAULT false,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notifications_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "Roles" (
    "Id" SERIAL NOT NULL,
    "Name" TEXT NOT NULL,
    "Description" TEXT,

    CONSTRAINT "Roles_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "Subcategories" (
    "Id" SERIAL NOT NULL,
    "CategoryId" INTEGER NOT NULL,
    "Name" TEXT NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Subcategories_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "TicketActivityLogs" (
    "Id" SERIAL NOT NULL,
    "TicketId" INTEGER NOT NULL,
    "UserId" INTEGER NOT NULL,
    "Action" TEXT NOT NULL,
    "OldValue" TEXT,
    "NewValue" TEXT,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketActivityLogs_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "TicketAttachments" (
    "Id" SERIAL NOT NULL,
    "TicketId" INTEGER NOT NULL,
    "CommentId" INTEGER,
    "UploaderId" INTEGER NOT NULL,
    "FileName" TEXT NOT NULL,
    "FilePath" TEXT NOT NULL,
    "FileSize" INTEGER NOT NULL,
    "ContentType" TEXT NOT NULL,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketAttachments_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "TicketComments" (
    "Id" SERIAL NOT NULL,
    "TicketId" INTEGER NOT NULL,
    "UserId" INTEGER NOT NULL,
    "CommentText" TEXT NOT NULL,
    "IsInternal" BOOLEAN NOT NULL DEFAULT false,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketComments_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "Tickets" (
    "Id" SERIAL NOT NULL,
    "TicketNumber" TEXT NOT NULL,
    "Title" TEXT NOT NULL,
    "Description" TEXT NOT NULL,
    "CompanyId" INTEGER NOT NULL,
    "DepartmentId" INTEGER NOT NULL,
    "CategoryId" INTEGER NOT NULL,
    "SubcategoryId" INTEGER,
    "Priority" TEXT NOT NULL,
    "Status" TEXT NOT NULL DEFAULT 'Open',
    "CreatedById" INTEGER NOT NULL,
    "AssignedToId" INTEGER,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CustomerExpectedResolutionAt" TIMESTAMP(3),
    "SupportExpectedResolutionAt" TIMESTAMP(3),
    "ResolvedAt" TIMESTAMP(3),
    "ClosedAt" TIMESTAMP(3),

    CONSTRAINT "Tickets_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "Users" (
    "Id" SERIAL NOT NULL,
    "FullName" TEXT NOT NULL,
    "Email" TEXT NOT NULL,
    "PasswordHash" TEXT,
    "MobileNumber" TEXT,
    "CompanyId" INTEGER,
    "DepartmentId" INTEGER,
    "RoleId" INTEGER NOT NULL,
    "Status" TEXT NOT NULL DEFAULT 'Pending',
    "AuthProvider" TEXT NOT NULL DEFAULT 'Local',
    "ProviderId" TEXT,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Users_pkey" PRIMARY KEY ("Id")
);

-- CreateIndex
CREATE INDEX "IX_AssetAssignmentHistory_AssetId_AssignedAt" ON "AssetAssignmentHistory"("AssetId", "AssignedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Assets_AssetCode_key" ON "Assets"("AssetCode");

-- CreateIndex
CREATE INDEX "IX_Assets_Status" ON "Assets"("Status");

-- CreateIndex
CREATE INDEX "IX_Assets_Category" ON "Assets"("Category");

-- CreateIndex
CREATE INDEX "IX_Assets_ExpiryDate" ON "Assets"("ExpiryDate");

-- CreateIndex
CREATE INDEX "IX_Assets_WarrantyExpiry" ON "Assets"("WarrantyExpiry");

-- CreateIndex
CREATE UNIQUE INDEX "Categories_Name_key" ON "Categories"("Name");

-- CreateIndex
CREATE UNIQUE INDEX "Companies_Name_key" ON "Companies"("Name");

-- CreateIndex
CREATE UNIQUE INDEX "Departments_Name_key" ON "Departments"("Name");

-- CreateIndex
CREATE INDEX "IX_Notifications_UserId_IsRead" ON "Notifications"("UserId", "IsRead");

-- CreateIndex
CREATE UNIQUE INDEX "Roles_Name_key" ON "Roles"("Name");

-- CreateIndex
CREATE INDEX "IX_TicketActivityLogs_TicketId" ON "TicketActivityLogs"("TicketId");

-- CreateIndex
CREATE INDEX "IX_TicketComments_TicketId" ON "TicketComments"("TicketId");

-- CreateIndex
CREATE UNIQUE INDEX "Tickets_TicketNumber_key" ON "Tickets"("TicketNumber");

-- CreateIndex
CREATE INDEX "IX_Tickets_AssignedTo_Status" ON "Tickets"("AssignedToId", "Status");

-- CreateIndex
CREATE INDEX "IX_Tickets_CompanyId" ON "Tickets"("CompanyId");

-- CreateIndex
CREATE INDEX "IX_Tickets_CreatedBy_Company" ON "Tickets"("CreatedById", "CompanyId");

-- CreateIndex
CREATE INDEX "IX_Tickets_Status_Priority_CreatedAt" ON "Tickets"("Status", "Priority", "CreatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Users_Email_key" ON "Users"("Email");

-- CreateIndex
CREATE INDEX "IX_Users_CompanyId" ON "Users"("CompanyId");

-- CreateIndex
CREATE INDEX "IX_Users_Status" ON "Users"("Status");

-- AddForeignKey
ALTER TABLE "AssetAssignmentHistory" ADD CONSTRAINT "AssetAssignmentHistory_AssetId_fkey" FOREIGN KEY ("AssetId") REFERENCES "Assets"("Id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "AssetAssignmentHistory" ADD CONSTRAINT "AssetAssignmentHistory_AssignedById_fkey" FOREIGN KEY ("AssignedById") REFERENCES "Users"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Assets" ADD CONSTRAINT "Assets_CreatedById_fkey" FOREIGN KEY ("CreatedById") REFERENCES "Users"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Assets" ADD CONSTRAINT "Assets_UpdatedById_fkey" FOREIGN KEY ("UpdatedById") REFERENCES "Users"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Categories" ADD CONSTRAINT "Categories_DefaultAssigneeId_fkey" FOREIGN KEY ("DefaultAssigneeId") REFERENCES "Users"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Notifications" ADD CONSTRAINT "Notifications_TicketId_fkey" FOREIGN KEY ("TicketId") REFERENCES "Tickets"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Notifications" ADD CONSTRAINT "Notifications_UserId_fkey" FOREIGN KEY ("UserId") REFERENCES "Users"("Id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Subcategories" ADD CONSTRAINT "Subcategories_CategoryId_fkey" FOREIGN KEY ("CategoryId") REFERENCES "Categories"("Id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "TicketActivityLogs" ADD CONSTRAINT "TicketActivityLogs_TicketId_fkey" FOREIGN KEY ("TicketId") REFERENCES "Tickets"("Id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "TicketActivityLogs" ADD CONSTRAINT "TicketActivityLogs_UserId_fkey" FOREIGN KEY ("UserId") REFERENCES "Users"("Id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "TicketAttachments" ADD CONSTRAINT "TicketAttachments_CommentId_fkey" FOREIGN KEY ("CommentId") REFERENCES "TicketComments"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "TicketAttachments" ADD CONSTRAINT "TicketAttachments_TicketId_fkey" FOREIGN KEY ("TicketId") REFERENCES "Tickets"("Id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "TicketAttachments" ADD CONSTRAINT "TicketAttachments_UploaderId_fkey" FOREIGN KEY ("UploaderId") REFERENCES "Users"("Id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "TicketComments" ADD CONSTRAINT "TicketComments_TicketId_fkey" FOREIGN KEY ("TicketId") REFERENCES "Tickets"("Id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "TicketComments" ADD CONSTRAINT "TicketComments_UserId_fkey" FOREIGN KEY ("UserId") REFERENCES "Users"("Id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Tickets" ADD CONSTRAINT "Tickets_AssignedToId_fkey" FOREIGN KEY ("AssignedToId") REFERENCES "Users"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Tickets" ADD CONSTRAINT "Tickets_CategoryId_fkey" FOREIGN KEY ("CategoryId") REFERENCES "Categories"("Id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Tickets" ADD CONSTRAINT "Tickets_CompanyId_fkey" FOREIGN KEY ("CompanyId") REFERENCES "Companies"("Id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Tickets" ADD CONSTRAINT "Tickets_CreatedById_fkey" FOREIGN KEY ("CreatedById") REFERENCES "Users"("Id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Tickets" ADD CONSTRAINT "Tickets_DepartmentId_fkey" FOREIGN KEY ("DepartmentId") REFERENCES "Departments"("Id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Tickets" ADD CONSTRAINT "Tickets_SubcategoryId_fkey" FOREIGN KEY ("SubcategoryId") REFERENCES "Subcategories"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Users" ADD CONSTRAINT "Users_CompanyId_fkey" FOREIGN KEY ("CompanyId") REFERENCES "Companies"("Id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Users" ADD CONSTRAINT "Users_DepartmentId_fkey" FOREIGN KEY ("DepartmentId") REFERENCES "Departments"("Id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Users" ADD CONSTRAINT "Users_RoleId_fkey" FOREIGN KEY ("RoleId") REFERENCES "Roles"("Id") ON DELETE RESTRICT ON UPDATE NO ACTION;
