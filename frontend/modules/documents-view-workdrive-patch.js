/**
 * WorkDrive Integration Patch for Documents View
 * Add these methods to documents-view.js
 */

// Add after loadDocuments() method:

/**
 * Merge local and WorkDrive documents
 * Prioritizes WorkDrive metadata when file exists in both
 */
mergeDocuments(localDocs, workdriveDocs) {
    // Create map of WorkDrive files by filename
    const workdriveMap = new Map(
        workdriveDocs.map(wd => [wd.filename, wd])
    );

    // Merge local with WorkDrive metadata
    return localDocs.map(doc => {
        const wdFile = workdriveMap.get(doc.filename);
        if (wdFile) {
            return {
                ...doc,
                workdriveFileId: wdFile.id,
                workdrivePermalink: wdFile.permalink,
                workdriveEmbedUrl: wdFile.embedUrl,
                syncedAt: wdFile.modifiedAt,
                isSynced: true
            };
        }
        return {
            ...doc,
            isSynced: false
        };
    });
}

/**
 * Sync local PDF to WorkDrive
 */
async syncToWorkDrive(filename) {
    try {
        showNotification('Uploading to WorkDrive...', 'info');
        updateStatus(`Syncing ${filename} to WorkDrive...`, 'info');

        const response = await fetch(`${this.API_BASE}/api/documents/sync-to-workdrive/${encodeURIComponent(filename)}`, {
            method: 'POST'
        });

        const result = await response.json();

        if (result.success) {
            showNotification('✅ Synced to WorkDrive', 'success');
            updateStatus('Document synced successfully', 'success');

            // Reload documents to show updated sync status
            await this.loadDocuments();
        } else {
            throw new Error(result.error || 'Sync failed');
        }
    } catch (error) {
        console.error('[DOCUMENTS VIEW] Sync error:', error);
        showNotification(`❌ Sync failed: ${error.message}`, 'error');
        updateStatus('Sync failed', 'error');
    }
}

// Replace renderDocumentCard() method with this version:

/**
 * Render a single document card with WorkDrive sync status
 */
renderDocumentCard(doc) {
    const icon = this.getDocumentIcon(doc.type);
    const formattedDate = new Date(doc.created).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    const sizeKB = (doc.size / 1024).toFixed(1);

    // Sync badge
    const syncBadge = doc.isSynced ?
        `<span class="sync-badge synced" title="Synced to Zoho WorkDrive" style="background: rgba(34, 197, 94, 0.1); color: rgb(34, 197, 94); padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 600;">☁️ SYNCED</span>` :
        `<span class="sync-badge not-synced" title="Local only - not synced" style="background: rgba(245, 158, 11, 0.1); color: rgb(245, 158, 11); padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 600;">💾 LOCAL</span>`;

    // WorkDrive link
    const workdriveLink = doc.workdrivePermalink ?
        `<a href="${doc.workdrivePermalink}" target="_blank" class="workdrive-link"
            style="display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--accent-blue); text-decoration: none; margin-top: 8px; padding: 6px; background: rgba(59, 130, 246, 0.05); border-radius: 6px; transition: background 0.2s;"
            onmouseenter="this.style.background='rgba(59, 130, 246, 0.1)'"
            onmouseleave="this.style.background='rgba(59, 130, 246, 0.05)'">
            <span class="material-symbols-outlined" style="font-size: 14px;">open_in_new</span>
            <span>Open in WorkDrive</span>
        </a>` :
        '';

    return `
        <div class="document-card" style="background: var(--bg-elevated); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 16px; transition: all 0.2s; cursor: pointer;"
             onmouseenter="this.style.borderColor='var(--accent-blue)'; this.style.transform='translateY(-2px)';"
             onmouseleave="this.style.borderColor='var(--border-subtle)'; this.style.transform='translateY(0)';">

            <!-- Document Icon & Type -->
            <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px;">
                <div style="background: rgba(59, 130, 246, 0.1); padding: 12px; border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                    <span class="material-symbols-outlined" style="color: var(--accent-blue); font-size: 28px;">${icon}</span>
                </div>
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                        <div style="font-size: 10px; text-transform: uppercase; color: var(--text-tertiary); letter-spacing: 0.5px;">
                            ${doc.type || 'Document'}
                        </div>
                        ${syncBadge}
                    </div>
                    <div style="font-size: 13px; font-weight: 600; color: var(--text-primary); line-height: 1.3; word-break: break-word;">
                        ${this.escapeHtml(doc.filename.replace(/\.[^/.]+$/, ''))}
                    </div>
                </div>
            </div>

            <!-- Document Metadata -->
            <div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; padding: 8px 0; border-top: 1px solid var(--border-subtle); border-bottom: 1px solid var(--border-subtle);">
                ${doc.customer ? `
                    <div style="display: flex; align-items: center; gap: 8px; font-size: 11px;">
                        <span class="material-symbols-outlined" style="font-size: 14px; color: var(--text-tertiary);">business</span>
                        <span style="color: var(--text-secondary);">${this.escapeHtml(doc.customer)}</span>
                    </div>
                ` : ''}
                <div style="display: flex; align-items: center; gap: 8px; font-size: 11px;">
                    <span class="material-symbols-outlined" style="font-size: 14px; color: var(--text-tertiary);">schedule</span>
                    <span style="color: var(--text-secondary);">${formattedDate}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px; font-size: 11px;">
                    <span class="material-symbols-outlined" style="font-size: 14px; color: var(--text-tertiary);">insert_drive_file</span>
                    <span style="color: var(--text-secondary);">${sizeKB} KB</span>
                </div>
            </div>

            ${workdriveLink}

            <!-- Action Buttons -->
            <div style="display: flex; gap: 8px; margin-top: 12px;">
                <button onclick="window.documentsView.previewDocument('${this.escapeHtml(doc.filename)}')"
                        class="btn btn-secondary"
                        style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px; font-size: 11px;">
                    <span class="material-symbols-outlined" style="font-size: 16px;">visibility</span>
                    <span>Preview</span>
                </button>
                <button onclick="window.documentsView.downloadDocument('${this.escapeHtml(doc.filename)}')"
                        class="btn btn-primary"
                        style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px; font-size: 11px;">
                    <span class="material-symbols-outlined" style="font-size: 16px;">download</span>
                    <span>Download</span>
                </button>
                ${!doc.isSynced ? `
                    <button onclick="window.documentsView.syncToWorkDrive('${this.escapeHtml(doc.filename)}')"
                            class="btn btn-secondary"
                            style="padding: 8px; font-size: 11px;"
                            title="Upload to WorkDrive">
                        <span class="material-symbols-outlined" style="font-size: 16px;">cloud_upload</span>
                    </button>
                ` : ''}
                <button onclick="window.documentsView.deleteDocument('${this.escapeHtml(doc.filename)}')"
                        class="btn btn-secondary"
                        style="padding: 8px; font-size: 11px; color: var(--accent-danger);"
                        title="Delete document">
                    <span class="material-symbols-outlined" style="font-size: 16px;">delete</span>
                </button>
            </div>
        </div>
    `;
}

// Replace loadDocuments() method to include WorkDrive:

async loadDocuments() {
    if (this.isLoading) return;

    this.isLoading = true;
    updateStatus('Loading documents...', 'info');

    try {
        // Load local PDFs
        const localResponse = await fetch(`${this.API_BASE}/api/documents/list`);

        if (!localResponse.ok) {
            throw new Error(`Failed to load documents: ${localResponse.statusText}`);
        }

        const localDocs = await localResponse.json();

        // Try to load WorkDrive PDFs (graceful fallback if not configured)
        let workdriveDocs = [];
        try {
            const wdResponse = await fetch(`${this.API_BASE}/api/workdrive/list-pdfs`);
            if (wdResponse.ok) {
                const wdData = await wdResponse.json();
                if (wdData.success) {
                    workdriveDocs = wdData.pdfs || [];
                }
            }
        } catch (wdError) {
            console.warn('[DOCUMENTS VIEW] WorkDrive unavailable:', wdError.message);
            // Continue with local only
        }

        // Merge local and WorkDrive documents
        this.documents = this.mergeDocuments(localDocs, workdriveDocs);
        this.filteredDocuments = [...this.documents];

        console.log('[DOCUMENTS VIEW] Loaded documents:', this.documents.length);
        console.log('[DOCUMENTS VIEW] WorkDrive synced:', workdriveDocs.length);

        this.renderDocuments();
        updateStatus(`Loaded ${this.documents.length} documents`, 'success');

    } catch (error) {
        console.error('[DOCUMENTS VIEW] Error loading documents:', error);
        updateStatus('Failed to load documents', 'error');
        this.renderError(error.message);
    } finally {
        this.isLoading = false;
    }
}
