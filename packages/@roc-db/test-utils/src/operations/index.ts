import { applyDraft } from "./applyDraft"
import { createBlockImage } from "./createBlockImage"
import { createBlockParagrah } from "./createBlockParagraph"
import { createBlockRow } from "./createBlockRow"
import { createBlockTitle } from "./createBlockTitle"
import { createDraft } from "./createDraft"
import { createPost } from "./createPost"
import { deleteBlocks } from "./deleteBlocks"
import { deletePost } from "./deletePost"
import { moveBlocks } from "./moveBlocks"
import { readEntity } from "./readEntity"
import { readMutation } from "./readMutation"
import { readPost } from "./readPost"
import { testTransactionalEdits } from "./testTransactionalEdits"
import { updateBlockParagraph } from "./updateBlockParagraph"
import { updatePost } from "./updatePost"
import { updatePostDescription } from "./updatePostDescription"
import { updatePostTitle } from "./updatePostTitle"

export const operations = [
    applyDraft,
    createBlockImage,
    createBlockTitle,
    createBlockParagrah,
    createBlockRow,
    createDraft,
    createPost,
    deleteBlocks,
    deletePost,
    moveBlocks,
    readEntity,
    readMutation,
    readPost,
    testTransactionalEdits,
    updateBlockParagraph,
    updatePost,
    updatePostDescription,
    updatePostTitle,
] as const
