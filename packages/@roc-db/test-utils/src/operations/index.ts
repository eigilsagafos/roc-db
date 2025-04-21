import { applyDraft } from "./applyDraft"
import { createBlockImage } from "./createBlockImage"
import { createBlockParagrah } from "./createBlockParagraph"
import { createBlockRow } from "./createBlockRow"
import { createBlockTitle } from "./createBlockTitle"
import { createDraft } from "./createDraft"
import { createPost } from "./createPost"
import { createUser } from "./createUser"
import { deleteBlocks } from "./deleteBlocks"
import { deleteDraft } from "./deleteDraft"
import { deletePost } from "./deletePost"
import { moveBlocks } from "./moveBlocks"
import { pageBlocks } from "./pageBlocks"
import { pageEmptyEntitiesArray } from "./pageEmptyEntitiesArray"
import { pagePosts } from "./pagePosts"
import { pageSplat } from "./pageSplat"
import { pagePostsByTag } from "./pagePostsByTag"
import { readEntity } from "./readEntity"
import { readMutation } from "./readMutation"
import { readPost } from "./readPost"
import { readPostBySlug } from "./readPostBySlug"
import { testTransactionalEdits } from "./testTransactionalEdits"
import { updateBlockParagraph } from "./updateBlockParagraph"
import { updatePost } from "./updatePost"
import { updatePostDescription } from "./updatePostDescription"
import { updatePostSlug } from "./updatePostSlug"
import { updatePostTags } from "./updatePostTags"
import { updatePostTitle } from "./updatePostTitle"

export const operations: any[] = [
    applyDraft,
    createBlockImage,
    createBlockTitle,
    createBlockParagrah,
    createBlockRow,
    createDraft,
    createPost,
    createUser,
    deleteBlocks,
    deleteDraft,
    deletePost,
    readPostBySlug,
    moveBlocks,
    pagePostsByTag,
    pageBlocks,
    readEntity,
    readMutation,
    readPost,
    pageEmptyEntitiesArray,
    pagePosts,
    pageSplat,
    testTransactionalEdits,
    updateBlockParagraph,
    updatePost,
    updatePostDescription,
    updatePostSlug,
    updatePostTags,
    updatePostTitle,
] as const
