import { createPageEntitiesOperation, pageMutations, redo, undo } from "roc-db"
import { entities } from "../entities"
import { applyDraft } from "./applyDraft"
import { createBlockImage } from "./createBlockImage"
import { createBlockParagrah } from "./createBlockParagraph"
import { createBlockRow } from "./createBlockRow"
import { createBlockRowReadingRoot } from "./createBlockRowReadingRoot"
import { createBlockTitle } from "./createBlockTitle"
import { createDraft } from "./createDraft"
import { createOrgSettings } from "./createOrgSettings"
import { createPost } from "./createPost"
import { createUnknownRef } from "./createUnknownRef"
import { createUser } from "./createUser"
import { deleteBlocks } from "./deleteBlocks"
import { deleteDraft } from "./deleteDraft"
import { deleteOrgSettings } from "./deleteOrgSettings"
import { deletePost } from "./deletePost"
import { duplicateDraft } from "./duplicateDraft"
import { moveBlocks } from "./moveBlocks"
import { pageBlocks } from "./pageBlocks"
import { pageEmptyEntitiesArray } from "./pageEmptyEntitiesArray"
import { pagePosts } from "./pagePosts"
import { pageSplat } from "./pageSplat"
import { pagePostsByTag } from "./pagePostsByTag"
import { readEntity } from "./readEntity"
import { readMutation } from "./readMutation"
import { readOrgSettings } from "./readOrgSettings"
import { readPost } from "./readPost"
import { readPostBySlug } from "./readPostBySlug"
import { testTransactionalEdits } from "./testTransactionalEdits"
import { updateBlockParagraph } from "./updateBlockParagraph"
import { updateOrgSettingsName } from "./updateOrgSettingsName"
import { updatePost } from "./updatePost"
import { updatePostDescription } from "./updatePostDescription"
import { updatePostSlug } from "./updatePostSlug"
import { updatePostTags } from "./updatePostTags"
import { updatePostTitle } from "./updatePostTitle"
import { crudBySlug } from "./crudBySlug"

export const operations: any[] = [
    // Built-ins are opt-in now; register them explicitly so the fixtures keep
    // exposing adapter.undo()/redo()/pageMutations()/pageEntities().
    pageMutations,
    createPageEntitiesOperation(entities),
    undo,
    redo,
    applyDraft,
    createBlockImage,
    createBlockTitle,
    createBlockParagrah,
    createBlockRow,
    createBlockRowReadingRoot,
    createDraft,
    createOrgSettings,
    createPost,
    createUnknownRef,
    createUser,
    crudBySlug,
    deleteBlocks,
    deleteDraft,
    deleteOrgSettings,
    deletePost,
    duplicateDraft,
    readPostBySlug,
    moveBlocks,
    pagePostsByTag,
    pageBlocks,
    readEntity,
    readMutation,
    readOrgSettings,
    readPost,
    pageEmptyEntitiesArray,
    pagePosts,
    pageSplat,
    testTransactionalEdits,
    updateBlockParagraph,
    updateOrgSettingsName,
    updatePost,
    updatePostDescription,
    updatePostSlug,
    updatePostTags,
    updatePostTitle,
] as const
