import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Link from '@mui/material/Link'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useState, type FormEvent } from 'react'
import { Link as RouterLink, useLocation } from 'react-router'

import { COMMENT_MAX, type CommentRead } from '../api/types'
import { useMe } from '../auth/useAuth'
import { useCommentActions, useComments } from '../social/hooks'

function when(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function CommentItem({ comment, pokemonId }: { comment: CommentRead; pokemonId: number }) {
  const { edit, remove } = useCommentActions(pokemonId)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(comment.body)
  const [confirmDelete, setConfirmDelete] = useState(false)

  function save(event: FormEvent) {
    event.preventDefault()
    edit.mutate({ id: comment.id, body: draft }, { onSuccess: () => setEditing(false) })
  }

  return (
    <Paper variant="outlined" component="li" sx={{ p: 2, listStyle: 'none' }}>
      <Stack spacing={1}>
        <Typography variant="body2" color="text.secondary">
          <strong>{comment.author}</strong> · {when(comment.created_at)}
          {comment.updated_at && ' · edited'}
        </Typography>

        {editing ? (
          <Stack component="form" spacing={1} onSubmit={save}>
            <TextField
              label="Edit your comment"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              multiline
              minRows={2}
              slotProps={{ htmlInput: { maxLength: COMMENT_MAX } }}
            />
            {edit.isError && <Alert severity="error">{edit.error.message}</Alert>}
            <Stack direction="row" spacing={1}>
              <Button type="submit" variant="contained" size="small" disabled={edit.isPending}>
                Save
              </Button>
              <Button size="small" onClick={() => (setEditing(false), setDraft(comment.body))}>
                Cancel
              </Button>
            </Stack>
          </Stack>
        ) : (
          // Rendered as text: React escapes it, so HTML in a comment is shown, never run.
          <Typography sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
            {comment.body}
          </Typography>
        )}

        {comment.mine && !editing && (
          <Stack direction="row" spacing={1}>
            <Button size="small" onClick={() => setEditing(true)}>
              Edit
            </Button>
            {confirmDelete ? (
              <>
                <Button
                  size="small"
                  color="error"
                  variant="contained"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(comment.id)}
                >
                  Yes, delete
                </Button>
                <Button size="small" onClick={() => setConfirmDelete(false)}>
                  Keep it
                </Button>
              </>
            ) : (
              <Button size="small" color="error" onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
            )}
          </Stack>
        )}
      </Stack>
    </Paper>
  )
}

function NewComment({ pokemonId }: { pokemonId: number }) {
  const { add } = useCommentActions(pokemonId)
  const [body, setBody] = useState('')

  function submit(event: FormEvent) {
    event.preventDefault()
    add.mutate(body, { onSuccess: () => setBody('') })
  }

  return (
    <Stack component="form" spacing={1} onSubmit={submit}>
      <TextField
        label="Add a comment"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        multiline
        minRows={2}
        helperText={`${body.length}/${COMMENT_MAX}`}
        slotProps={{ htmlInput: { maxLength: COMMENT_MAX } }}
      />
      {add.isError && <Alert severity="error">{add.error.message}</Alert>}
      <div>
        <Button type="submit" variant="contained" disabled={add.isPending || !body.trim()}>
          Post comment
        </Button>
      </div>
    </Stack>
  )
}

/** Comments on a Pokémon: everyone can read; signed-in users with a nickname can post. */
export function CommentsSection({ pokemonId }: { pokemonId: number }) {
  const me = useMe()
  const comments = useComments(pokemonId)
  const location = useLocation()

  return (
    <Stack spacing={1.5} component="section" aria-labelledby="comments-heading">
      <Typography id="comments-heading" variant="h6" component="h2">
        Comments{comments.data ? ` (${comments.data.length})` : ''}
      </Typography>

      {me.data?.nickname ? (
        <NewComment pokemonId={pokemonId} />
      ) : me.data ? (
        <Typography color="text.secondary">
          <Link component={RouterLink} to="/nickname" state={{ from: location.pathname }}>
            Choose a nickname
          </Link>{' '}
          to comment. It's shown next to your comments.
        </Typography>
      ) : me.isPending ? null : (
        <Typography color="text.secondary">
          <Link component={RouterLink} to="/signin" state={{ from: location.pathname }}>
            Sign in to comment
          </Link>
          . Anyone can read comments.
        </Typography>
      )}

      {comments.isError ? (
        <Alert severity="error">Couldn't load comments.</Alert>
      ) : comments.isPending ? null : comments.data.length === 0 ? (
        <Typography color="text.secondary">No comments yet.</Typography>
      ) : (
        <Stack component="ul" spacing={1} sx={{ m: 0, p: 0 }}>
          {comments.data.map((c) => (
            <CommentItem key={c.id} comment={c} pokemonId={pokemonId} />
          ))}
        </Stack>
      )}
    </Stack>
  )
}
